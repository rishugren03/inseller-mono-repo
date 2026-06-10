import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Inbox from "./pages/Inbox";
import Customize from "./pages/Customize";
import Leads from "./pages/Leads";
import Auth from "./pages/Auth";
import { useAuth } from "./auth/AuthContext";
import { logOut } from "./lib/firebase";
import { fetchJson } from "./lib/api";

function App() {
  const { initializing, isAuthenticated, user } = useAuth();
  const [loadingStore, setLoadingStore] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingStore(true);
      fetchJson("/api/store")
        .then((store) => {
          if (store?.id) {
            localStorage.setItem("insellerStoreId", store.id);
          }
        })
        .catch((err) => console.error("Failed to fetch store info", err))
        .finally(() => setLoadingStore(false));
    } else {
      setLoadingStore(false);
    }
  }, [isAuthenticated]);

  if (initializing || loadingStore) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="app-shell">
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            Inseller
          </div>
          <p>AI sales assistant</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
            Dashboard
          </NavLink>
          <NavLink to="/inbox" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
            Inbox
          </NavLink>
          <NavLink to="/leads" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Leads
          </NavLink>
          <NavLink to="/customize" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>
            Customize
          </NavLink>
        </nav>
        <div className="sidebar-account">
          <span>{user?.email || "Signed in"}</span>
          <button type="button" onClick={logOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="dashboard-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/customize" element={<Customize />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
