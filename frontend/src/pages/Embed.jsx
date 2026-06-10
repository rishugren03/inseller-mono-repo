import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function Embed() {
  const [storeId] = useState(localStorage.getItem("insellerStoreId") || "");
  const [settings, setSettings] = useState({ brevoSender: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    fetchJson(`/api/widget-config/${storeId}`)
      .then((data) => {
        setSettings({ brevoSender: data.brevoSender || "" });
      })
      .catch(() => {});
  }, [storeId]);

  const handleSave = async () => {
    if (!storeId)
      return setStatus({ type: "error", message: "No store ID found." });
    setLoading(true);
    setStatus(null);
    try {
      await fetchJson(`/api/store/${storeId}`, {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setStatus({ type: "success", message: "Store reply-to email saved." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!storeId)
      return setStatus({ type: "error", message: "No store ID found." });
    setLoading(true);
    setStatus(null);
    try {
      const body = await fetchJson(`/api/sync/${storeId}`, { method: "POST" });
      setStatus({
        type: "success",
        message: `${body.productsSynced} products synced.`,
      });
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
          <h1>Embed widget</h1>
          <p>Copy the script snippet and install it into Shopify theme code.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card form-card">
          <label>
            Store reply-to email
            <input
              value={settings.brevoSender}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  brevoSender: e.target.value,
                }))
              }
              placeholder="store@example.com"
            />
          </label>
          <button className="button" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save reply-to email"}
          </button>
          <button
            className="button secondary"
            onClick={handleSync}
            disabled={loading}
          >
            {loading ? "Working..." : "Re-sync catalog"}
          </button>
          {status && (
            <div className={`status-block ${status.type}`}>
              {status.message}
            </div>
          )}
        </div>

        <div className="card embed-card">
          <h2>Install script</h2>
          <pre className="code-block">
            {`<script src="https://your-backend.com/widget.js" data-store-id="${storeId || "STORE_ID"}"></script>`}
          </pre>
          <div className="guide">
            <p>1. Go to Shopify Admin</p>
            <p>2. Online Store → Themes → Edit code</p>
            <p>3. Open theme.liquid</p>
            <p>
              4. Paste before <code>&lt;/body&gt;</code>
            </p>
            <p>
              5. Inseller sends follow-up emails using its own sender address;
              customers reply to the store email you provide.
            </p>
          </div>
          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: "8px 0" }}>Widget preview</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <ProductCard
                image="https://via.placeholder.com/160"
                title={`Cream Embroidered Floral Printed Chanderi A-line Kurta with Straight Pants and Dupatta Set`}
                price={"₹5,299.00"}
                onView={() => console.log("view product 1")}
              />

              <ProductCard
                image="https://via.placeholder.com/160/ffe4e1"
                title={`Blue Thread Embroidered Chanderi Set`}
                price={"₹7,999.00"}
                onView={() => console.log("view product 2")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
