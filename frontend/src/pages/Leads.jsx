import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Leads() {
  const [storeId] = useState(localStorage.getItem("insellerStoreId") || "");
  const [leads, setLeads] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    fetchJson(`/api/leads/${storeId}`)
      .then(setLeads)
      .catch((error) => {
        setStatus({ type: "error", message: error.message });
      });
  }, [storeId]);

  const weeklyCount = leads.filter((lead) => {
    const date = new Date(lead.createdAt);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return date.getTime() >= oneWeekAgo;
  }).length;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <p>{weeklyCount} leads captured this week</p>
        </div>
      </div>

      {status && (
        <div className={`status-block ${status.type}`}>{status.message}</div>
      )}

      <div className="card leads-card">
        <div className="table-head">
          <span>Name</span>
          <span>Email</span>
          <span>Messages</span>
          <span>Date</span>
        </div>
        {leads.map((lead) => (
          <div key={lead.id} className="lead-row">
            <button
              className="lead-summary"
              onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
            >
              <span>{lead.visitorName || "Anonymous"}</span>
              <span>{lead.visitorEmail || "-"}</span>
              <span>{lead.messageCount}</span>
              <span>{formatDate(lead.createdAt)}</span>
            </button>
            {expanded === lead.id && (
              <div className="lead-detail">
                <pre>{JSON.stringify(lead.messages, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
