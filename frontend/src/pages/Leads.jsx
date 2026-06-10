import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Leads() {
  const [storeId] = useState(localStorage.getItem("insellerStoreId") || "");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [status, setStatus] = useState(null);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [weeklyCount, setWeeklyCount] = useState(0);

  // Debounce search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch leads function
  const fetchLeads = async () => {
    if (!storeId) return;
    setLoading(true);
    setStatus(null);
    try {
      const query = `/api/leads/${storeId}?page=${page}&limit=${limit}&search=${encodeURIComponent(
        debouncedSearch
      )}`;
      const res = await fetchJson(query);
      setLeads(res.leads || []);
      setTotalLeads(res.total || 0);
      setTotalPages(res.pages || 1);
      setWeeklyCount(res.weeklyCount || 0);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Re-run fetch when parameters change
  useEffect(() => {
    fetchLeads();
  }, [storeId, page, limit, debouncedSearch]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <p>{weeklyCount} leads captured in the past 7 days</p>
        </div>
      </div>

      {status && (
        <div className={`status-block ${status.type}`} style={{ marginBottom: "20px" }}>
          {status.message}
        </div>
      )}

      {/* Filters & Limits row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div className="search-bar-container" style={{ maxWidth: "400px" }}>
          <input
            type="text"
            className="search-input"
            placeholder="Search leads by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.88rem", fontWeight: "600" }}>
            Rows per page:
          </span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setPage(1);
            }}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Main Leads Table Card */}
      <div className="card leads-card">
        <div className="table-head">
          <span>Name</span>
          <span>Email</span>
          <span>Messages</span>
          <span>Date Joined</span>
        </div>

        {/* Loading skeletons */}
        {loading ? (
          Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton-item" style={{ width: "60%" }} />
              <div className="skeleton-item" style={{ width: "80%" }} />
              <div className="skeleton-item" style={{ width: "30%" }} />
              <div className="skeleton-item" style={{ width: "50%" }} />
            </div>
          ))
        ) : leads.length === 0 ? (
          <div style={{ padding: "40px", textAlignment: "center", color: "var(--text-muted)" }}>
            No leads found matching your search.
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="lead-row">
              <button
                className="lead-summary"
                onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
              >
                <span style={{ fontWeight: "700" }}>{lead.visitorName || "Anonymous visitor"}</span>
                <span style={{ color: "var(--text-muted)" }}>{lead.visitorEmail || "-"}</span>
                <span>{lead.messageCount} messages</span>
                <span>{formatDate(lead.createdAt)}</span>
              </button>
              {expanded === lead.id && (
                <div className="lead-detail">
                  <h4>Chat Transcript</h4>
                  <div className="chat-transcript-view">
                    {Array.isArray(lead.messages) && lead.messages.length > 0 ? (
                      lead.messages.map((msg, idx) => {
                        const isUser = msg.role === "user";
                        const time = formatTime(msg.timestamp || lead.createdAt);
                        return (
                          <div
                            key={idx}
                            className={`transcript-msg ${isUser ? "user" : "assistant"}`}
                          >
                            <span className="transcript-role">
                              {isUser ? lead.visitorName || "Visitor" : "AI Assistant"} • {time}
                            </span>
                            <span>{msg.content}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        No messages in transcript.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Pagination Footer */}
        {!loading && totalLeads > 0 && (
          <div className="pagination-container">
            <div>
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, totalLeads)} of {totalLeads} leads
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              
              {/* Generate Page numbers */}
              {Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1;
                // Show if it's close to current page
                if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                  return (
                    <button
                      key={p}
                      className={`pagination-btn${page === p ? " active" : ""}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  );
                } else if (p === 2 || p === totalPages - 1) {
                  return <span key={p} style={{ margin: "0 4px" }}>...</span>;
                }
                return null;
              })}

              <button
                className="pagination-btn"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
