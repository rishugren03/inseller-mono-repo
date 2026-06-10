import { Link, Route, Routes, Navigate } from "react-router-dom";
import Onboard from "./pages/Onboard";
import Customize from "./pages/Customize";
import Embed from "./pages/Embed";
import Leads from "./pages/Leads";
import Auth from "./pages/Auth";
import { useAuth } from "./auth/AuthContext";
import { logOut } from "./lib/firebase";

function App() {
  const { initializing, isAuthenticated, user } = useAuth();

  if (initializing) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="app-shell">
      <aside className="dashboard-sidebar">
        <div className="brand">
          <div className="brand-mark">Inseller</div>
          <p>AI sales chat for Shopify</p>
        </div>
        <nav>
          <Link to="/" className="nav-link">
            Onboard
          </Link>
          <Link to="/customize" className="nav-link">
            Customize
          </Link>
          <Link to="/embed" className="nav-link">
            Embed
          </Link>
          <Link to="/leads" className="nav-link">
            Leads
          </Link>
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
          <Route path="/" element={<Onboard />} />
          <Route path="/customize" element={<Customize />} />
          <Route path="/embed" element={<Embed />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
