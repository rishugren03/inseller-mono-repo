(function () {
  const script =
    document.currentScript ||
    Array.from(document.getElementsByTagName("script")).find(
      (s) => s.src && s.src.includes("widget.js") && s.dataset.storeId,
    );
  if (!script) {
    console.error("Inseller widget: missing script tag or data-store-id");
    return;
  }

  const storeId = script.dataset.storeId;
  const scriptOrigin = new URL(script.src).origin;
  const apiBase = `${scriptOrigin}/api`;
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(fontLink);

  const style = document.createElement("style");
  style.id = "ins-styles";
  style.innerHTML = `
    .ins-widget-root { position: fixed; right: 24px; bottom: 24px; z-index: 999999; font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif; }
    .ins-pill-button { display: inline-flex; align-items: center; gap: 10px; background: var(--ins-accent, #111827); color: var(--ins-text-on-accent, #ffffff); border-radius: 999px; border: 1px solid rgba(17,24,39,0.08); padding: 12px 18px; cursor: pointer; box-shadow: 0 18px 50px rgba(17,24,39,0.22); transform: translateY(0); transition: transform 0.3s ease, box-shadow 0.3s ease; font-weight: 700; }
    .ins-pill-button:hover { transform: translateY(-2px); }
    .ins-pill-avatar { width: 32px; height: 32px; background: rgba(255,255,255,0.12); border-radius: 50%; display: grid; place-items: center; }
    .ins-pill-dot { width: 12px; height: 12px; border-radius: 50%; background: #ef4444; animation: ins-pulse 1.6s infinite ease-in-out; }
    @keyframes ins-pulse { 0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.35);opacity:0.6;} }
    .ins-nudge { position: absolute; right: 0; bottom: 72px; background: #ffffff; border: 1px solid #e5e7eb; color: #111827; padding: 12px 14px; border-radius: 12px; width: 240px; font-size: 0.95rem; line-height: 1.45; box-shadow: 0 16px 38px rgba(17,24,39,0.14); opacity: 0; transform: translateY(10px); transition: opacity 0.3s ease, transform 0.3s ease; }
    .ins-nudge.show { opacity: 1; transform: translateY(0); }
    .ins-window { position: absolute; right: 0; bottom: 64px; width: 450px; max-width: calc(100vw - 32px); height: 650px; max-height: calc(100vh - 120px); background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 32px 90px rgba(17,24,39,0.24); overflow: hidden; display: flex; flex-direction: column; opacity: 0; visibility: hidden; pointer-events: none; transform: translateY(20px) scale(0.96); transform-origin: right bottom; transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s ease; }
    .ins-window.open { opacity: 1; visibility: visible; pointer-events: auto; transform: translateY(0) scale(1); }
    .ins-window-header { display: flex; align-items: center; justify-content: space-between; padding: 18px; background: var(--ins-accent, #111827); border-bottom: 1px solid rgba(255,255,255,0.08); }
    .ins-window-header-left { display: flex; align-items: center; gap: 12px; }
    .ins-window-header-left > span { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,0.12); font-size: 1.2rem; }
    .ins-header-icon { color: var(--ins-text-on-accent, #ffffff); }
    .ins-window-title { display: flex; flex-direction: column; line-height: 1.1; }
    .ins-window-title strong { color: var(--ins-text-on-accent, #ffffff); font-size: 1rem; }
    .ins-window-title .ins-online { color: var(--ins-text-on-accent, #ffffff); font-size: 0.82rem; margin-top: 5px; opacity: 0.85; }
    .ins-close-button { width: 34px; height: 34px; border:none; border-radius: 8px; background: rgba(255,255,255,0.1); color: var(--ins-text-on-accent, #ffffff); cursor:pointer; font-size: 1.35rem; line-height: 1; }
    .ins-close-button:hover { background: rgba(255,255,255,0.18); }
    .ins-messages { flex:1; padding: 18px; overflow-y:auto; display:flex; flex-direction:column; gap: 12px; background: #f8fafc; }
    .ins-message { max-width: 84%; padding: 12px 14px; border-radius: 14px; line-height: 1.5; font-size: 0.94rem; overflow-wrap: anywhere; box-shadow: 0 1px 2px rgba(17,24,39,0.04); }
    .ins-agent, .ins-assistant { align-self: flex-start; background: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
    .ins-user { align-self: flex-end; background: var(--ins-accent, #FF6B2C); color: var(--ins-text-on-accent, #111827); border-bottom-right-radius: 4px; font-weight: 600; }
    .ins-contact { align-self: stretch; background: #ffffff; color: #111827; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; box-shadow: 0 1px 2px rgba(17,24,39,0.04); }
    .ins-contact label { display:flex; flex-direction:column; gap: 6px; margin-bottom: 12px; color: #374151; font-size: 0.9rem; font-weight: 700; }
    .ins-contact input { width: 100%; border-radius: 10px; padding: 11px 12px; border: 1px solid #cbd5e1; background:#ffffff; color:#111827; outline: none; }
    .ins-contact input:focus, .ins-input-row input:focus { border-color: var(--ins-accent, #FF6B2C); box-shadow: 0 0 0 3px rgba(255,107,44,0.16); }
    .ins-contact-button { display:inline-flex; align-items:center; justify-content:center; border:none; border-radius:10px; padding: 11px 14px; background: var(--ins-accent, #FF6B2C); color: var(--ins-text-on-accent, #111827); cursor:pointer; font-weight: 800; }
    .ins-product-card { align-self: stretch; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(15,23,42,0.05); margin-top: 8px; flex-shrink: 0; }
    .ins-product-image-container { width: 100%; height: 150px; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1px solid #f1f5f9; }
    .ins-product-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
    .ins-product-card:hover .ins-product-image { transform: scale(1.03); }
    .ins-product-image-fallback { font-size: 3rem; color: #94a3b8; user-select: none; }
    .ins-product-info { padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
    .ins-product-title { color: #0f172a; font-size: 0.95rem; font-weight: 600; line-height: 1.3; margin: 0; }
    .ins-product-price { color: #16a34a; font-size: 0.95rem; font-weight: 700; margin: 0; }
    .ins-product-description { color: #64748b; font-size: 0.82rem; line-height: 1.4; margin: 4px 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .ins-product-actions { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 8px; }
    .ins-product-button-primary { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 10px 14px; background: var(--ins-accent, #FF6B2C); color: var(--ins-text-on-accent, #ffffff) !important; border: none; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: opacity 0.2s ease; text-align: center; box-shadow: 0 2px 4px rgba(255,107,44,0.15); box-sizing: border-box; }
    .ins-product-button-primary:hover { opacity: 0.92; }
    .ins-product-button-secondary { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 9px 14px; background: #f1f5f9; color: #334155 !important; border: 1px solid #cbd5e1; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: background 0.2s ease; text-align: center; box-sizing: border-box; }
    .ins-product-button-secondary:hover { background: #e2e8f0; }
    .ins-typing { align-self: flex-start; display:flex; gap:6px; padding:12px 14px; background:#ffffff; border: 1px solid #e5e7eb; border-radius:14px; border-bottom-left-radius: 4px; }
    .ins-dot { width:8px; height:8px; border-radius:50%; background:#6b7280; animation: ins-bounce 0.9s infinite ease-in-out; }
    .ins-dot:nth-child(2) { animation-delay: 0.15s; }
    .ins-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes ins-bounce { 0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);} }
    .ins-input-row { display:flex; gap: 10px; padding: 14px; border-top:1px solid #e5e7eb; background:#ffffff; }
    .ins-input-row input { flex:1; min-width: 0; border-radius: 10px; border:1px solid #cbd5e1; padding: 12px 14px; background:#ffffff; color:#111827; outline: none; }
    .ins-input-row input::placeholder { color: #6b7280; }
    .ins-input-row button { border:none; border-radius:10px; padding: 12px 16px; background: var(--ins-accent, #FF6B2C); color: var(--ins-text-on-accent, #111827); cursor:pointer; font-weight: 800; }
    .ins-footer { padding: 10px 18px; border-top: 1px solid #f1f5f9; background: #ffffff; font-size: 0.8rem; color:#6b7280; text-align:center; }
    .ins-product-card.ins-compact { flex-direction: row; height: 90px; align-items: center; }
    .ins-product-card.ins-compact .ins-product-image-container { width: 90px; height: 90px; border-bottom: none; border-right: 1px solid #f1f5f9; flex-shrink: 0; }
    .ins-product-card.ins-compact .ins-product-info { padding: 8px 10px; flex: 1; min-width: 0; justify-content: center; }
    .ins-product-card.ins-compact .ins-product-title { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ins-product-card.ins-compact .ins-product-price { font-size: 0.85rem; }
    .ins-product-card.ins-compact .ins-product-description { display: none; }
    .ins-product-card.ins-compact .ins-product-actions { padding: 8px 12px 8px 0; flex-direction: column; gap: 4px; width: 110px; flex-shrink: 0; }
    .ins-product-card.ins-compact .ins-product-button-primary { padding: 6px 8px; font-size: 0.75rem; box-shadow: none; }
    .ins-product-card.ins-compact .ins-product-button-secondary { padding: 5px 8px; font-size: 0.75rem; }
    @media(max-width:420px){ .ins-widget-root{right:12px;bottom:12px;} .ins-window{width:calc(100vw - 24px);max-width:none;height:calc(100vh - 96px);max-height:none;bottom:60px;} .ins-pill-label{display:none;} }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "ins-widget-root";
  root.innerHTML = `
    <div class="ins-nudge">Need help finding the right product? Ask me anything.</div>
    <button type="button" class="ins-pill-button">
      <span class="ins-pill-avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      </span>
      <span class="ins-pill-label"></span>
      <span class="ins-pill-dot"></span>
    </button>
    <div class="ins-window" aria-hidden="true">
      <div class="ins-window-header">
        <div class="ins-window-header-left">
          <span class="ins-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </span>
          <div class="ins-window-title">
            <strong></strong>
            <span class="ins-online">● online</span>
          </div>
        </div>
        <button type="button" class="ins-close-button">×</button>
      </div>
      <div class="ins-messages"></div>
      <div class="ins-input-row">
        <input type="text" placeholder="Type your message..." aria-label="Type your message" />
        <button type="button">Send</button>
      </div>
      <div class="ins-footer">Powered by Inseller</div>
    </div>
  `;
  document.body.appendChild(root);

  const pill = root.querySelector(".ins-pill-button");
  const nudge = root.querySelector(".ins-nudge");
  const windowEl = root.querySelector(".ins-window");
  const titleEl = root.querySelector(".ins-window-title strong");
  const labelEl = root.querySelector(".ins-pill-label");
  const closeBtn = root.querySelector(".ins-close-button");
  const messagesEl = root.querySelector(".ins-messages");
  const input = root.querySelector(".ins-input-row input");
  const sendBtn = root.querySelector(".ins-input-row button");

  let state = {
    conversationId:
      sessionStorage.getItem(`inseller-${storeId}-conversation`) || null,
    visitorName: null,
    visitorEmail: null,
    contactShown: false,
    waiting: false,
    isInquiryResponse: false,
  };

  function getContrastColor(hexColor) {
    let hex = (hexColor || "#FF6B2C").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    if (hex.length !== 6) return "#ffffff";
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? "#111827" : "#ffffff";
  }

  function setAccent(color) {
    const bg = color || "#FF6B2C";
    root.style.setProperty("--ins-accent", bg);
    root.style.setProperty("--ins-text-on-accent", getContrastColor(bg));
  }

  function animateOpen(open) {
    if (open) {
      windowEl.classList.add("open");
      windowEl.setAttribute("aria-hidden", "false");
    } else {
      windowEl.classList.remove("open");
      windowEl.setAttribute("aria-hidden", "true");
    }
  }

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

  function addMessage(role, content) {
    const message = document.createElement("div");
    message.className = `ins-message ins-${role}`;
    message.innerHTML = parseMarkdown(content);
    messagesEl.appendChild(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return message;
  }

  function addTyping() {
    const wrapper = document.createElement("div");
    wrapper.className = "ins-typing";
    wrapper.innerHTML =
      '<span class="ins-dot"></span><span class="ins-dot"></span><span class="ins-dot"></span>';
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrapper;
  }

  function isSafeProductUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function addProductCard(product, isSecondaryCard = false) {
    if (!product) return;
    const safeUrl = isSafeProductUrl(product.url) ? product.url : "#";

    const card = document.createElement("div");
    card.className = `ins-product-card${isSecondaryCard ? " ins-compact" : ""}`;

    // 1. Image Container
    const imgContainer = document.createElement("div");
    imgContainer.className = "ins-product-image-container";

    if (product.image) {
      const img = document.createElement("img");
      img.className = "ins-product-image";
      img.src = product.image;
      img.alt = product.title || "Product Image";
      img.loading = "lazy";
      img.onerror = () => {
        imgContainer.innerHTML = '<span class="ins-product-image-fallback">🛍</span>';
      };
      imgContainer.appendChild(img);
    } else {
      imgContainer.innerHTML = '<span class="ins-product-image-fallback">🛍</span>';
    }
    card.appendChild(imgContainer);

    // 2. Info Container
    const info = document.createElement("div");
    info.className = "ins-product-info";

    const title = document.createElement("h4");
    title.className = "ins-product-title";
    title.textContent = product.title || "Product";
    info.appendChild(title);

    const price = document.createElement("div");
    price.className = "ins-product-price";
    price.textContent = product.price || "";
    info.appendChild(price);

    if (product.description) {
      const desc = document.createElement("p");
      desc.className = "ins-product-description";
      desc.textContent = product.description;
      info.appendChild(desc);
    }
    card.appendChild(info);

    // 3. Actions Container
    const actions = document.createElement("div");
    actions.className = "ins-product-actions";

    if (isSecondaryCard) {
      const addToCartButton = document.createElement("a");
      addToCartButton.className = "ins-product-button-primary";
      addToCartButton.href = safeUrl;
      addToCartButton.target = "_blank";
      addToCartButton.rel = "noopener noreferrer";
      addToCartButton.textContent = "Add to cart";
      actions.appendChild(addToCartButton);

      const buyNowButton = document.createElement("a");
      buyNowButton.className = "ins-product-button-secondary";
      buyNowButton.href = safeUrl;
      buyNowButton.target = "_blank";
      buyNowButton.rel = "noopener noreferrer";
      buyNowButton.textContent = "Buy now";
      actions.appendChild(buyNowButton);
    } else {
      const viewButton = document.createElement("a");
      viewButton.className = "ins-product-button-primary";
      viewButton.href = safeUrl;
      viewButton.target = "_blank";
      viewButton.rel = "noopener noreferrer";
      viewButton.textContent = "View Product";
      actions.appendChild(viewButton);

      const inquireButton = document.createElement("button");
      inquireButton.type = "button";
      inquireButton.className = "ins-product-button-secondary";
      inquireButton.textContent = "Inquire About This";
      inquireButton.addEventListener("click", () => {
        state.isInquiryResponse = true;
        input.value = `I am interested in: "${product.title || "this product"}". Can you tell me more about it?`;
        input.focus();
        submitMessage();
      });
      actions.appendChild(inquireButton);
    }

    card.appendChild(actions);
    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addProductCards(products, isSecondaryCard = false) {
    if (!Array.isArray(products)) return;
    products.forEach((p) => addProductCard(p, isSecondaryCard));
  }

  function showContactBlock() {
    if (state.contactShown) return;
    state.contactShown = true;
    const block = document.createElement("div");
    block.className = "ins-contact";
    block.innerHTML = `
      <label>
        Name
        <input type="text" placeholder="Your name" class="ins-contact-name" />
      </label>
      <label>
        Email
        <input type="email" placeholder="you@example.com" class="ins-contact-email" />
      </label>
      <button type="button" class="ins-contact-button">Save contact</button>
    `;
    messagesEl.appendChild(block);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    const nameInput = block.querySelector(".ins-contact-name");
    const emailInput = block.querySelector(".ins-contact-email");
    const saveButton = block.querySelector(".ins-contact-button");
    saveButton.addEventListener("click", () => {
      state.visitorName = nameInput.value.trim() || state.visitorName;
      state.visitorEmail = emailInput.value.trim() || state.visitorEmail;
      block.remove();
      addMessage(
        "assistant",
        "Thanks! I will use that to follow up if needed.",
      );
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  async function loadConfig() {
    try {
      const res = await fetch(`${apiBase}/widget-config/${storeId}`);
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load widget config");
      titleEl.textContent = data.botName || "Inseller";
      labelEl.textContent = data.botName || "Inseller";
      setAccent(data.themeColor);
      setTimeout(
        () =>
          addMessage(
            "assistant",
            data.greeting || "Hey! How can I help you today?",
          ),
        1000,
      );
      pill.addEventListener("click", () => animateOpen(true));
      closeBtn.addEventListener("click", () => animateOpen(false));
      sendBtn.addEventListener("click", submitMessage);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submitMessage();
        }
      });
      setTimeout(() => nudge.classList.add("show"), 8000);
      setTimeout(() => nudge.classList.remove("show"), 12000);
    } catch (error) {
      console.error(error);
      addMessage("assistant", "Unable to load Inseller chat right now.");
    }
  }

  async function submitMessage() {
    const text = input.value.trim();
    if (!text || state.waiting) return;
    addMessage("user", text);
    input.value = "";
    if (!state.contactShown) {
      showContactBlock();
    }
    const typing = addTyping();
    state.waiting = true;

    const wasInquiryResponse = state.isInquiryResponse;
    state.isInquiryResponse = false;

    try {
      const payload = {
        storeId,
        message: text,
        conversationId: state.conversationId,
        isInquiry: wasInquiryResponse,
      };
      if (state.visitorName) payload.visitorName = state.visitorName;
      if (state.visitorEmail) payload.visitorEmail = state.visitorEmail;

      const response = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat request failed");

      state.conversationId = data.conversationId;
      sessionStorage.setItem(
        `inseller-${storeId}-conversation`,
        data.conversationId,
      );

      messagesEl.removeChild(typing);
      addMessage("assistant", data.reply || "Sorry, I did not get that.");
      addProductCards(
        Array.isArray(data.products)
          ? data.products
          : data.product
            ? [data.product]
            : [],
        wasInquiryResponse,
      );
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (error) {
      if (typing.parentNode) messagesEl.removeChild(typing);
      addMessage(
        "assistant",
        "Sorry, something went wrong. Please try again later.",
      );
      console.error(error);
    } finally {
      state.waiting = false;
    }
  }

  loadConfig();
})();
