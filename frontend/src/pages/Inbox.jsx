import { useEffect, useState, useRef, useCallback } from "react";
import { fetchJson } from "../lib/api";

/* ─────────────────────────────────────────
   Helpers — mirror the widget / backend
───────────────────────────────────────── */

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeDate(value) {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function getAvatarGradient(name) {
  const palettes = [
    ["#6366f1", "#8b5cf6"], ["#3b82f6", "#2563eb"], ["#10b981", "#059669"],
    ["#f59e0b", "#d97706"], ["#ec4899", "#db2777"], ["#14b8a6", "#0d9488"],
  ];
  const idx = name ? name.charCodeAt(0) % palettes.length : 0;
  return palettes[idx];
}

/** Replicate the backend's extractAndStripProducts on the frontend */
function extractAndStripProducts(text) {
  if (!text) return { products: [], cleanText: "" };
  const parsedProducts = [];
  let cleanText = text;
  const jsonBlockRegex = /(\{[\s\S]*?)(?:\}|$)/g;
  let match;
  const rangesToRemove = [];

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const fullMatchText = match[0];
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatchText.length;
    let jsonStr = fullMatchText;
    if (!jsonStr.endsWith("}")) jsonStr += "}";

    let parsed = null;
    try { parsed = JSON.parse(jsonStr); } catch (e) {
      try { parsed = JSON.parse(jsonStr + '"'); } catch (e2) {
        try { parsed = JSON.parse(jsonStr + '"}'); } catch (e3) { /* noop */ }
      }
    }

    let title = "", price = "", url = "", image = "", description = "";
    if (parsed && typeof parsed === "object") {
      title = parsed.title || parsed.product || "";
      price = parsed.price || "";
      url = parsed.url || "";
      image = parsed.image || "";
      description = parsed.description || "";
    } else {
      const tM = jsonStr.match(/"title"\s*:\s*"(?<title>[^"]+)"/i);
      const pM = jsonStr.match(/"price"\s*:\s*"(?<price>[^"]+)"/i);
      const uM = jsonStr.match(/"url"\s*:\s*"(?<url>[^"]*?)(?:"|$)/i);
      if (tM) title = tM.groups.title;
      if (pM) price = pM.groups.price;
      if (uM) url = uM.groups.url;
    }

    if (title || url) {
      parsedProducts.push({ title, price, url, image, description });
      rangesToRemove.push({ start: matchStart, end: matchEnd });
    }
  }

  rangesToRemove.sort((a, b) => b.start - a.start);
  for (const range of rangesToRemove) {
    let s = range.start, e = range.end;
    const before = cleanText.substring(0, s);
    const fenceStart = before.match(/```(?:json)?\s*$/i);
    if (fenceStart) s -= fenceStart[0].length;
    const after = cleanText.substring(e);
    const fenceEnd = after.match(/^\s*```/i);
    if (fenceEnd) e += fenceEnd[0].length;
    cleanText = cleanText.substring(0, s) + cleanText.substring(e);
  }

  cleanText = cleanText.replace(/[ \t]+-\s*(?=\n|$)/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return { products: parsedProducts, cleanText };
}

/** Widget's parseMarkdown — bold, italic, newlines */
function parseMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

/** Process a raw message array → [{...msg, products, cleanContent}] */
function processMessages(messages) {
  return messages.map((msg) => {
    if (msg.role === "assistant" && !msg.sender) {
      // May already have products (from /api/chat/:id polling path),
      // or may have raw JSON embedded (from /api/inbox/:storeId path)
      if (msg.products && msg.products.length > 0) {
        return { ...msg, cleanContent: msg.content, products: msg.products };
      }
      const { products, cleanText } = extractAndStripProducts(msg.content);
      return { ...msg, cleanContent: cleanText, products };
    }
    return { ...msg, cleanContent: msg.content, products: [] };
  });
}

const PAGE_SIZE = 20;

/* ─────────────────────────────────────────
   Product Card component (mirrors widget)
───────────────────────────────────────── */
function ProductCard({ product, compact = false, accentColor = "#FF6B2C" }) {
  const safeUrl = product?.url && (product.url.startsWith("http://") || product.url.startsWith("https://"))
    ? product.url : "#";
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`wgt-product-card${compact ? " wgt-compact" : ""}`}>
      <div className="wgt-product-img-wrap">
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.title}
            className="wgt-product-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="wgt-product-img-fallback">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </div>
        )}
      </div>
      <div className="wgt-product-info">
        <h4 className="wgt-product-title">{product.title || "Product"}</h4>
        {product.price && <p className="wgt-product-price">{product.price}</p>}
        {!compact && product.description && (
          <p className="wgt-product-desc">{product.description}</p>
        )}
      </div>
      <div className="wgt-product-actions">
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="wgt-btn-primary"
          style={{ background: accentColor }}
        >
          {compact ? "Add to cart" : "View Product"}
        </a>
        {compact ? (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="wgt-btn-secondary"
          >
            Buy now
          </a>
        ) : (
          <button
            type="button"
            className="wgt-btn-secondary"
            disabled
          >
            Inquire About This
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Inbox Component
───────────────────────────────────────── */
export default function Inbox() {
  const [storeId] = useState(localStorage.getItem("insellerStoreId") || "");
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeConvData, setActiveConvData] = useState(null); // fully processed, with images
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [themeColor, setThemeColor] = useState("#FF6B2C");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);
  const pollingRef = useRef(null);

  const handleManualRefresh = async () => {
    if (refreshing || !storeId) return;
    setRefreshing(true);
    try {
      const data = await fetchJson(`/api/inbox/${storeId}`);
      const all = data || [];
      setConversations(all.slice(0, page * PAGE_SIZE));
      setHasMore(all.length > page * PAGE_SIZE);

      if (activeConvId) {
        const chatData = await fetchJson(`/api/chat/${activeConvId}`);
        setActiveConvData(chatData);
      }
    } catch (err) {
      console.error("Manual refresh failed", err);
    } finally {
      setRefreshing(false);
    }
  };
  const chatPollingRef = useRef(null);
  const inputRef = useRef(null);

  // Load store theme color
  useEffect(() => {
    if (!storeId) return;
    fetchJson(`/api/widget-config/${storeId}`)
      .then((d) => { if (d?.themeColor) setThemeColor(d.themeColor); })
      .catch(() => {});
  }, [storeId]);

  const loadConversations = async (reset = false) => {
    if (!storeId) return;
    if (reset) { setLoading(true); setPage(1); }
    try {
      const data = await fetchJson(`/api/inbox/${storeId}`);
      const all = data || [];
      setConversations(all.slice(0, PAGE_SIZE));
      setHasMore(all.length > PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    if (!storeId) return;
    try {
      const data = await fetchJson(`/api/inbox/${storeId}`);
      const all = data || [];
      setConversations((prev) => all.slice(0, Math.max(prev.length, PAGE_SIZE)));
    } catch (_) {}
  };

  useEffect(() => {
    loadConversations(true);
    pollingRef.current = setInterval(silentRefresh, 4000);
    return () => clearInterval(pollingRef.current);
  }, [storeId]);

  // Fetch fully-processed conversation (with product images) from /api/chat/:id
  const loadActiveConv = useCallback(async (convId) => {
    if (!convId) return;
    setChatLoading(true);
    try {
      const data = await fetchJson(`/api/chat/${convId}`);
      setActiveConvData(data);
    } catch (err) {
      console.error("Failed to load conversation detail", err);
    } finally {
      setChatLoading(false);
    }
  }, []);

  // When active conversation changes, load its full data
  useEffect(() => {
    if (!activeConvId) { setActiveConvData(null); return; }
    loadActiveConv(activeConvId);
    // Poll this conversation for new messages every 4s
    clearInterval(chatPollingRef.current);
    chatPollingRef.current = setInterval(async () => {
      try {
        const data = await fetchJson(`/api/chat/${activeConvId}`);
        setActiveConvData(data);
      } catch (_) {}
    }, 4000);
    return () => clearInterval(chatPollingRef.current);
  }, [activeConvId, loadActiveConv]);

  const handleSidebarScroll = useCallback(async () => {
    const el = sidebarRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      setLoadingMore(true);
      try {
        const data = await fetchJson(`/api/inbox/${storeId}`);
        const all = data || [];
        const nextPage = page + 1;
        setConversations(all.slice(0, nextPage * PAGE_SIZE));
        setHasMore(all.length > nextPage * PAGE_SIZE);
        setPage(nextPage);
      } catch (_) {}
      finally { setLoadingMore(false); }
    }
  }, [storeId, page, hasMore, loadingMore]);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleSidebarScroll);
    return () => el.removeEventListener("scroll", handleSidebarScroll);
  }, [handleSidebarScroll]);

  // Use activeConvData (from /api/chat/:id) for processed messages with images
  // Fall back to sidebar data for metadata (takenOver, visitorName, etc.)
  const activeConvMeta = conversations.find((c) => c.id === activeConvId);
  const activeConv = activeConvData
    ? { ...activeConvMeta, ...activeConvData }
    : activeConvMeta;

  // Messages are already processed by the backend (/api/chat/:id runs buildProductCards)
  const processedMessages = activeConvData?.messages
    ? activeConvData.messages.map((msg) => ({
        ...msg,
        cleanContent: msg.content,
        products: msg.products || [],
      }))
    : (activeConvMeta ? processMessages(activeConvMeta.messages || []) : []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [processedMessages.length, activeConvId]);

  useEffect(() => {
    if (activeConv?.takenOver) inputRef.current?.focus();
  }, [activeConv?.takenOver]);

  const handleTakeoverToggle = async () => {
    if (!activeConv) return;
    const newState = !activeConv.takenOver;
    try {
      setConversations((prev) =>
        prev.map((c) => c.id === activeConv.id ? { ...c, takenOver: newState } : c)
      );
      if (activeConvData) {
        setActiveConvData((prev) => prev ? { ...prev, takenOver: newState } : prev);
      }
      const res = await fetchJson(`/api/inbox/${activeConv.id}/takeover`, {
        method: "POST",
        body: JSON.stringify({ takenOver: newState }),
      });
      if (res) {
        setConversations((prev) =>
          prev.map((c) => c.id === activeConv.id ? { ...c, takenOver: res.takenOver } : c)
        );
        setActiveConvData((prev) => prev ? { ...prev, takenOver: res.takenOver } : prev);
      }
    } catch (err) {
      alert("Failed: " + err.message);
      loadConversations(true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeConv || !replyText.trim() || sending) return;
    setSending(true);
    const text = replyText.trim();
    setReplyText("");
    try {
      const tempMsg = { role: "assistant", content: text, sender: "merchant", timestamp: new Date().toISOString() };
      setConversations((prev) =>
        prev.map((c) => c.id === activeConv.id ? { ...c, messages: [...(c.messages || []), tempMsg] } : c)
      );
      if (activeConvData) {
        setActiveConvData((prev) => prev ? { ...prev, messages: [...(prev.messages || []), tempMsg] } : prev);
      }
      const res = await fetchJson(`/api/inbox/${activeConv.id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      if (res) {
        setConversations((prev) =>
          prev.map((c) => c.id === activeConv.id ? { ...c, messages: res.messages } : c)
        );
        setActiveConvData((prev) => {
          if (!prev) return prev;
          const processedMsgs = res.messages.map((msg) => {
            if (msg.role === "assistant" && !msg.sender) {
              const { products, cleanText } = extractAndStripProducts(msg.content);
              return { ...msg, content: cleanText || msg.content, products: products || [] };
            }
            return msg;
          });
          return { ...prev, messages: processedMsgs };
        });
      }
    } catch (err) {
      alert("Failed to send: " + err.message);
      loadConversations(true);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
  };

  const filteredConvs = conversations.filter((c) => {
    if (!sidebarSearch.trim()) return true;
    const q = sidebarSearch.toLowerCase();
    return (c.visitorName || "").toLowerCase().includes(q) ||
           (c.visitorEmail || "").toLowerCase().includes(q);
  });

  if (!storeId) {
    return (
      <div className="inbox-page">
        <div className="inbox-center-state">
          <div className="inbox-empty-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
          </div>
          <h2>No Store Connected</h2>
          <p>Connect your store on the Dashboard page first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="inbox-page">
        <div className="inbox-center-state">
          <div className="loading-spinner" />
          <p>Loading conversations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-page">
      {/* ── Sidebar ── */}
      <aside className="inbox-sidebar">
        <div className="inbox-sidebar-header">
          <div className="inbox-sidebar-title-row">
            <h2>Inbox</h2>
            <span className="inbox-count-pill">{conversations.length}</span>
            <button
              type="button"
              className="inbox-refresh-btn"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh inbox"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? "spin-animation" : ""}
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
          </div>
          <div className="inbox-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inbox-search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              className="inbox-search-input"
              placeholder="Search conversations…"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
            {sidebarSearch && (
              <button className="inbox-search-clear" onClick={() => setSidebarSearch("")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>
        </div>

        <div className="inbox-conv-list" ref={sidebarRef}>
          {filteredConvs.length === 0 ? (
            <div className="inbox-conv-empty">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
              <p>{sidebarSearch ? "No results found" : "No conversations yet"}</p>
            </div>
          ) : (
            filteredConvs.map((c) => {
              const msgs = Array.isArray(c.messages) ? c.messages : [];
              const lastMsg = msgs[msgs.length - 1];
              const active = c.id === activeConvId;
              const name = c.visitorName || "Anonymous";
              const [from, to] = getAvatarGradient(name);
              return (
                <button
                  key={c.id}
                  className={`inbox-conv-item${active ? " active" : ""}`}
                  onClick={() => setActiveConvId(c.id)}
                >
                  <div className="inbox-conv-avatar" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                    {getInitials(name)}
                  </div>
                  <div className="inbox-conv-body">
                    <div className="inbox-conv-row1">
                      <span className="inbox-conv-name">{name}</span>
                      <span className="inbox-conv-ts">{formatRelativeDate(c.createdAt)}</span>
                    </div>
                    <div className="inbox-conv-row2">
                      <span className="inbox-conv-preview">
                        {lastMsg ? (lastMsg.sender === "merchant" ? "You: " : "") + lastMsg.content.replace(/\{[\s\S]*?\}/g, "").trim() : "No messages yet"}
                      </span>
                      <span className={`inbox-mode-chip ${c.takenOver ? "takeover" : "ai"}`}>
                        {c.takenOver ? "You" : "AI"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
          {loadingMore && (
            <div className="inbox-loading-more">
              <div className="inbox-loading-dots"><span /><span /><span /></div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat Panel ── */}
      <div className="inbox-chat-panel">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="inbox-chat-header">
              <div className="inbox-chat-header-left">
                {(() => {
                  const name = activeConv.visitorName || "Anonymous";
                  const [from, to] = getAvatarGradient(name);
                  return (
                    <div className="inbox-chat-avatar" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                      {getInitials(name)}
                    </div>
                  );
                })()}
                <div className="inbox-chat-info">
                  <h3>{activeConv.visitorName || "Anonymous visitor"}</h3>
                  <div className="inbox-chat-meta">
                    {activeConv.visitorEmail && (
                      <span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        {activeConv.visitorEmail}
                      </span>
                    )}
                    <span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {(activeConv.messages || []).length} messages
                    </span>
                  </div>
                </div>
              </div>
              <div className="inbox-chat-header-right">
                <div className={`inbox-status-chip ${activeConv.takenOver ? "merchant" : "ai"}`}>
                  <span className="inbox-status-dot" />
                  {activeConv.takenOver ? "You're in control" : "AI managing"}
                </div>
                <button
                  onClick={handleTakeoverToggle}
                  className={`inbox-takeover-btn ${activeConv.takenOver ? "handback" : "takeover"}`}
                >
                  {activeConv.takenOver ? (
                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg> Hand to AI</>
                  ) : (
                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Takeover</>
                  )}
                </button>
              </div>
            </div>

            {/* ── Widget-style message area ── */}
            <div className="wgt-messages-area">
              {chatLoading ? (
                <div className="inbox-no-messages">
                  <div className="loading-spinner" style={{ borderTopColor: themeColor }} />
                  <p>Loading messages…</p>
                </div>
              ) : processedMessages.length === 0 ? (
                <div className="inbox-no-messages">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <p>No messages yet</p>
                </div>
              ) : null}


              {processedMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isMerchant = msg.sender === "merchant";
                const isAI = !isUser && !isMerchant;
                const time = formatTime(msg.timestamp || activeConv.createdAt);
                const name = activeConv.visitorName || "Visitor";
                const [from, to] = getAvatarGradient(name);
                const hasProducts = isAI && msg.products && msg.products.length > 0;

                return (
                  <div key={idx}>
                    {/* Message bubble */}
                    <div className={`wgt-msg-row ${isUser ? "wgt-left" : "wgt-right"}`}>
                      {/* Avatar */}
                      {isUser && (
                        <div className="wgt-avatar" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                          {getInitials(name)}
                        </div>
                      )}
                      {isMerchant && (
                        <div className="wgt-avatar wgt-avatar-merchant">M</div>
                      )}
                      {isAI && (
                        <div className="wgt-avatar wgt-avatar-ai" style={{ background: themeColor }}>
                          AI
                        </div>
                      )}

                      <div className="wgt-bubble-wrap">
                        {msg.cleanContent && (
                          <div
                            className={`wgt-bubble ${isUser ? "wgt-bubble-user" : isMerchant ? "wgt-bubble-merchant" : "wgt-bubble-ai"}`}
                            style={isUser ? { background: themeColor } : {}}
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.cleanContent) }}
                          />
                        )}
                        <span className={`wgt-time ${isUser ? "wgt-time-right" : ""}`}>
                          {isUser ? (name) : isMerchant ? "You" : "AI Agent"} · {time}
                        </span>
                      </div>
                    </div>

                    {/* Product cards below AI message */}
                    {hasProducts && (
                      <div className="wgt-cards-container">
                        <div className="wgt-cards-area">
                          {msg.products.map((product, pi) => (
                            <ProductCard
                              key={pi}
                              product={product}
                              compact={!!msg.isInquiry}
                              accentColor={themeColor}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="inbox-footer">
              {!activeConv.takenOver && (
                <div className="inbox-ai-notice">
                  <div className="inbox-ai-notice-left">
                    <div className="inbox-ai-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>
                    </div>
                    <span>AI is handling this conversation</span>
                  </div>
                  <button className="inbox-notice-btn" onClick={handleTakeoverToggle}>Takeover</button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="inbox-compose">
                <div className={`inbox-compose-box${!activeConv.takenOver ? " disabled" : ""}`}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={activeConv.takenOver ? "Type a message… (Enter to send)" : "Takeover to reply manually"}
                    disabled={!activeConv.takenOver || sending}
                    className="inbox-compose-input"
                  />
                  <button
                    type="submit"
                    className="inbox-send-btn"
                    disabled={!activeConv.takenOver || !replyText.trim() || sending}
                    style={{ background: themeColor }}
                  >
                    {sending ? (
                      <div className="inbox-sending-dot" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="inbox-empty-chat">
            <div className="inbox-empty-chat-graphic">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h3>Select a conversation</h3>
            <p>Choose a thread from the sidebar to read messages and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}
