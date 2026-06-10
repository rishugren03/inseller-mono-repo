import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

export default function Customize() {
  const [storeId] = useState(localStorage.getItem("insellerStoreId") || "");
  const [settings, setSettings] = useState({
    botName: "",
    greeting: "",
    themeColor: "#FF6B2C",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    fetchJson(`/api/widget-config/${storeId}`)
      .then((data) => {
        setSettings(data);
      })
      .catch(() => {
        setStatus({ type: "error", message: "Unable to load store settings." });
      });
  }, [storeId]);

  const handleSave = async () => {
    if (!storeId) {
      setStatus({
        type: "error",
        message: "No store ID found. Onboard first.",
      });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await fetchJson(`/api/store/${storeId}`, {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setStatus({ type: "success", message: "Store settings saved." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Customize Inseller</h1>
          <p>Tune the bot voice, greeting, and accent color.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card form-card">
          <label>
            Bot name
            <input
              value={settings.botName}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, botName: e.target.value }))
              }
              placeholder="Inseller"
            />
          </label>

          <label>
            Greeting message
            <textarea
              value={settings.greeting}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, greeting: e.target.value }))
              }
              rows="4"
            />
          </label>

          <label>
            Theme color
            <input
              type="color"
              value={settings.themeColor}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, themeColor: e.target.value }))
              }
            />
          </label>

          <button className="button" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save settings"}
          </button>
          {status && (
            <div className={`status-block ${status.type}`}>
              {status.message}
            </div>
          )}
        </div>

        <div className="card preview-card">
          <h2>Widget preview</h2>
          <div
            className="widget-preview"
            style={{ "--accent": settings.themeColor }}
          >
            <div className="ins-pill">
              <span className="ins-pill-avatar">🛍</span>
              <span>{settings.botName || "Inseller"}</span>
              <span className="ins-pill-dot" />
            </div>
            <div className="ins-window">
              <div className="ins-header">
                <span>🛍</span>
                <div>
                  <strong>{settings.botName || "Inseller"}</strong>
                  <div className="online-dot">online</div>
                </div>
              </div>
              <div className="ins-message ins-agent">
                {settings.greeting || "Hey! How can I help you today?"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
