import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

const PRESET_COLORS = [
  "#FF6B2C", "#6366f1", "#10b981", "#3b82f6",
  "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444",
];

export default function Customize() {
  const [storeId] = useState(localStorage.getItem("insellerStoreId") || "");
  const [settings, setSettings] = useState({
    botName: "",
    greeting: "",
    themeColor: "#FF6B2C",
    brevoSender: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const widgetScript = storeId
    ? `<script src="${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/widget/widget.js" data-store-id="${storeId}"></script>`
    : `<script src="https://your-backend.com/widget.js" data-store-id="STORE_ID"></script>`;

  useEffect(() => {
    if (!storeId) return;
    fetchJson(`/api/widget-config/${storeId}`)
      .then((data) => {
        setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {
        setStatus({ type: "error", message: "Unable to load store settings." });
      });
  }, [storeId]);

  const handleSave = async () => {
    if (!storeId) {
      setStatus({ type: "error", message: "No store ID found. Onboard first." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await fetchJson(`/api/store/${storeId}`, {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setStatus({ type: "success", message: "Settings saved successfully." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(widgetScript).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    });
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Customize</h1>
          <p>Tune the bot voice, greeting, theme color, and email settings.</p>
        </div>
        <button className="button" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {status && (
        <div className={`status-block ${status.type}`} style={{ marginBottom: "24px" }}>
          {status.message}
        </div>
      )}

      <div className="customize-layout">
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Bot Personality Card */}
          <div className="card form-card">
            <div className="card-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>
              Bot Personality
            </div>
            <label>
              Bot name
              <input
                value={settings.botName}
                onChange={(e) => setSettings((prev) => ({ ...prev, botName: e.target.value }))}
                placeholder="Inseller"
              />
            </label>
            <label>
              Greeting message
              <textarea
                value={settings.greeting}
                onChange={(e) => setSettings((prev) => ({ ...prev, greeting: e.target.value }))}
                rows="3"
                placeholder="Hey! How can I help you today?"
              />
            </label>
          </div>

          {/* Theme Color Card */}
          <div className="card form-card">
            <div className="card-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>
              Theme Color
            </div>
            <div className="color-picker-row">
              <div className="color-presets">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`color-preset-swatch${settings.themeColor === color ? " selected" : ""}`}
                    style={{ background: color }}
                    onClick={() => setSettings((prev) => ({ ...prev, themeColor: color }))}
                    title={color}
                  >
                    {settings.themeColor === color && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    )}
                  </button>
                ))}
              </div>
              <label className="color-custom-label">
                <span>Custom</span>
                <div className="color-custom-input">
                  <input
                    type="color"
                    value={settings.themeColor}
                    onChange={(e) => setSettings((prev) => ({ ...prev, themeColor: e.target.value }))}
                    className="color-picker-native"
                  />
                  <span className="color-hex-display">{settings.themeColor}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Brevo Email Settings */}
          <div className="card form-card">
            <div className="card-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Brevo Email Settings
            </div>
            <label>
              Store reply-to email
              <input
                value={settings.brevoSender || ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, brevoSender: e.target.value }))}
                placeholder="store@example.com"
                type="email"
              />
            </label>
            <p className="field-hint">
              Inseller sends follow-up emails via Brevo. Customers will reply to this address.
            </p>
          </div>

          {/* Widget Script */}
          <div className="card">
            <div className="card-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              Widget Script Tag
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0 0 12px" }}>
              Add this to your Shopify <code>theme.liquid</code> before the closing <code>&lt;/body&gt;</code> tag.
            </p>
            <div style={{ position: "relative" }}>
              <pre className="code-block" style={{ paddingRight: "52px", margin: 0 }}>{widgetScript}</pre>
              <button onClick={handleCopyScript} className="copy-btn" title="Copy">
                {copiedScript ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                )}
              </button>
            </div>
            {copiedScript && <p style={{ color: "var(--success)", fontSize: "0.8rem", margin: "6px 0 0" }}>Copied!</p>}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div>
          <div className="card preview-card" style={{ position: "sticky", top: "24px" }}>
            <div className="card-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              Live Preview
            </div>
            <div className="widget-preview" style={{ "--accent": settings.themeColor }}>
              {/* Launcher pill */}
              <div className="ins-pill" style={{ background: settings.themeColor }}>
                <span className="ins-pill-avatar">🛍</span>
                <span>{settings.botName || "Inseller"}</span>
                <span className="ins-pill-dot" />
              </div>

              {/* Chat window */}
              <div className="ins-window">
                <div className="ins-header" style={{ background: settings.themeColor }}>
                  <span style={{ fontSize: "1.1rem" }}>🛍</span>
                  <div>
                    <strong style={{ color: "#fff" }}>{settings.botName || "Inseller"}</strong>
                    <div className="online-dot">online</div>
                  </div>
                </div>
                <div className="ins-message ins-agent">
                  {settings.greeting || "Hey! How can I help you today?"}
                </div>
              </div>
            </div>

            {/* Color indicator */}
            <div className="color-indicator">
              <div className="color-indicator-swatch" style={{ background: settings.themeColor }} />
              <span>{settings.themeColor}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
