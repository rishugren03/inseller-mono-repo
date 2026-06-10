import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchJson } from "../lib/api";

export default function Dashboard() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [shopUrl, setShopUrl] = useState("");
  const [onboardError, setOnboardError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const data = await fetchJson("/api/store");
      setStore(data);
      if (data?.id) {
        localStorage.setItem("insellerStoreId", data.id);
      }
    } catch (error) {
      console.error("Failed to load store data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!shopUrl.trim()) return;
    setLoading(true);
    setOnboardError("");
    try {
      const body = await fetchJson("/api/onboard", {
        method: "POST",
        body: JSON.stringify({ shopUrl: shopUrl.trim() }),
      });
      localStorage.setItem("insellerStoreId", body.storeId);
      await loadStoreData();
    } catch (err) {
      setOnboardError(err.message || "Failed to onboard store.");
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!store?.id) return;
    setSyncing(true);
    try {
      const body = await fetchJson(`/api/sync/${store.id}`, { method: "POST" });
      await loadStoreData();
      alert(`Sync completed! ${body.productsSynced} products updated.`);
    } catch (error) {
      alert("Failed to sync catalog: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // If no store is connected yet, render the onboarding flow
  if (!store) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <div>
            <h1>Welcome to Inseller</h1>
            <p>Connect your Shopify store to get started with your AI Sales Assistant.</p>
          </div>
        </div>

        <div className="card form-card" style={{ maxWidth: "600px", margin: "40px auto 0" }}>
          <h2>Connect Shopify Store</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            We'll fetch your product catalog to train the AI Sales Agent.
          </p>
          <form onSubmit={handleOnboard}>
            <label>
              Shopify Store URL
              <input
                type="text"
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                placeholder="example.myshopify.com"
                required
              />
            </label>
            <button type="submit" className="button" style={{ width: "100%" }}>
              Connect &amp; Sync Catalog
            </button>
          </form>
          {onboardError && (
            <div className="status-block error" style={{ marginTop: "16px" }}>
              {onboardError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Store is connected, render the status dashboard
  const productCount = Array.isArray(store.productCache) ? store.productCache.length : 0;
  const isBrevoActive = Boolean(store.brevoSender);
  const widgetScript = `<script src="${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/widget/widget.js" data-store-id="${store.id}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Monitor your shop integration, email notifications, and assistant status.</p>
        </div>
        <button
          className="button secondary"
          onClick={handleSync}
          disabled={syncing}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={syncing ? "spin-animation" : ""}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
          {syncing ? "Syncing Catalog..." : "Re-sync Catalog"}
        </button>
      </div>

      {/* Integration Status Grid */}
      <div className="status-grid">
        {/* Shopify Status */}
        <div className="card status-card">
          <div className="status-icon connected">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </div>
          <div className="status-info">
            <h3>Shopify Store</h3>
            <p style={{ margin: "4px 0" }}>{store.shopUrl}</p>
            <p style={{ margin: "4px 0 12px", fontSize: "0.85rem", color: "var(--success)" }}>
              {productCount} products synced and indexed
            </p>
            <span className="status-badge active">
              <span className="status-dot pulse" /> Connected
            </span>
          </div>
        </div>

        {/* Brevo Status */}
        <div className="card status-card">
          <div className={`status-icon ${isBrevoActive ? "connected" : "disconnected"}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </div>
          <div className="status-info">
            <h3>Brevo Email</h3>
            <p style={{ margin: "4px 0 12px" }}>
              {isBrevoActive
                ? `Replies route to ${store.brevoSender}`
                : "No sender email configured for follow-ups"}
            </p>
            {isBrevoActive ? (
              <span className="status-badge active">
                <span className="status-dot" /> Active
              </span>
            ) : (
              <span className="status-badge setup">
                <span className="status-dot" /> Setup Needed
              </span>
            )}
          </div>
        </div>

        {/* AI Agent Widget config status */}
        <div className="card status-card">
          <div className="status-icon connected">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
          </div>
          <div className="status-info">
            <h3>AI Sales Agent</h3>
            <p style={{ margin: "4px 0" }}>Bot: {store.botName || "Inseller"}</p>
            <p style={{ margin: "4px 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
              Theme:
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: store.themeColor,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
              {store.themeColor}
            </p>
            <span className="status-badge active">
              <span className="status-dot pulse" /> Agent Active
            </span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Widget Script Card */}
        <div className="card">
          <h2>Install Chat Widget</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: "1.5" }}>
            Paste this snippet inside the <code>&lt;body&gt;</code> tags of your Shopify theme layout file (usually <code>theme.liquid</code>) to render the chat button on your storefront.
          </p>
          <div style={{ position: "relative", margin: "16px 0" }}>
            <pre className="code-block" style={{ paddingRight: "56px" }}>{widgetScript}</pre>
            <button
              onClick={handleCopy}
              className="copy-btn"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              )}
            </button>
          </div>
          {copied && <p style={{ color: "var(--success)", fontSize: "0.82rem", margin: "-8px 0 8px" }}>Copied to clipboard!</p>}
          <div className="guide">
            <p>1. Open Shopify Admin → Online Store → Themes.</p>
            <p>2. Click <strong>Edit code</strong> under the Actions menu.</p>
            <p>3. Find <strong>theme.liquid</strong> and scroll to the bottom.</p>
            <p>4. Paste the snippet right before the closing <code>&lt;/body&gt;</code> tag and save.</p>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            <Link to="/inbox" className="quick-action-card">
              <div className="quick-action-icon inbox-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
              </div>
              <div className="quick-action-label">
                <span>Inbox</span>
                <small>Live conversations</small>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="quick-action-arrow"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Link>

            <Link to="/leads" className="quick-action-card">
              <div className="quick-action-icon leads-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div className="quick-action-label">
                <span>Leads</span>
                <small>Captured contacts</small>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="quick-action-arrow"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Link>

            <Link to="/customize" className="quick-action-card">
              <div className="quick-action-icon customize-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>
              </div>
              <div className="quick-action-label">
                <span>Customize</span>
                <small>Style &amp; voice</small>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="quick-action-arrow"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
