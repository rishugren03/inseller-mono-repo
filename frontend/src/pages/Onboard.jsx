import { useState } from "react";
import { fetchJson } from "../lib/api";

export default function Onboard() {
  const [shopUrl, setShopUrl] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const body = await fetchJson("/api/onboard", {
        method: "POST",
        body: JSON.stringify({ shopUrl }),
      });
      localStorage.setItem("insellerStoreId", body.storeId);
      setStatus({
        type: "success",
        message: `${body.productsSynced} products synced. Store ID stored.`,
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
          <h1>Onboard your Shopify store</h1>
          <p>Sync the shop catalog and generate an Inseller store record.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card form-card">
        <label>
          Shopify store URL
          <input
            type="text"
            value={shopUrl}
            onChange={(e) => setShopUrl(e.target.value)}
            placeholder="example.myshopify.com"
          />
        </label>
        <button
          type="submit"
          className="button"
          disabled={loading || !shopUrl.trim()}
        >
          {loading ? "Syncing..." : "Sync Catalog"}
        </button>
        {status && (
          <div className={`status-block ${status.type}`}>{status.message}</div>
        )}
      </form>
    </div>
  );
}
