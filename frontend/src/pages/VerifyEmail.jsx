import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { sendVerification, logOut } from "../lib/firebase";

export default function VerifyEmail() {
  const { user, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCheck = async () => {
    setChecking(true);
    setStatus(null);
    try {
      await refreshUser();
      // The verification check updates the auth context. If verified, the app shell handles transitions.
      // We set a brief delay to avoid flash of state.
      setTimeout(() => {
        setChecking(false);
        setStatus({
          type: "error",
          message: "Email verification not detected yet. Please make sure you have clicked the link inside the verification email.",
        });
      }, 1200);
    } catch (error) {
      setChecking(false);
      setStatus({ type: "error", message: "Failed to check status. Please try again." });
    }
  };

  const handleResend = async () => {
    setResending(true);
    setStatus(null);
    try {
      await sendVerification(user);
      setStatus({ type: "success", message: "A fresh verification link has been sent to your email address." });
      setCooldown(60);
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to send verification email." });
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel verify-panel">
        <div className="verify-icon-container">
          <div className="verify-icon-bg">
            <svg
              className="verify-icon"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>

        <h1 className="verify-title" style={{ fontSize: "1.8rem", margin: "16px 0 8px", fontWeight: 800 }}>
          Verify your email
        </h1>
        
        <p className="verify-desc" style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, textAlign: "center", marginBottom: "24px" }}>
          We've sent a verification link to <strong style={{ color: "var(--text-main)" }}>{user?.email}</strong>. 
          Please check your inbox and click the link to activate your account.
        </p>

        {status && (
          <div className={`status-block ${status.type}`} style={{ width: "100%", marginBottom: "20px", textAlign: "left" }}>
            {status.message}
          </div>
        )}

        <div className="verify-actions" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
          <button
            className="button"
            style={{ width: "100%", height: "46px" }}
            onClick={handleCheck}
            disabled={checking || resending}
            type="button"
          >
            {checking ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="loading-spinner" style={{ width: "18px", height: "18px", borderWidth: "2px" }} />
                Checking status...
              </span>
            ) : (
              "I've verified my email"
            )}
          </button>

          <button
            className="button secondary"
            style={{ width: "100%", height: "46px" }}
            onClick={handleResend}
            disabled={checking || resending || cooldown > 0}
            type="button"
          >
            {resending ? "Sending..." : cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
          </button>
        </div>

        <button
          className="verify-signout-btn"
          style={{
            marginTop: "24px",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            cursor: "pointer",
            textDecoration: "underline",
            transition: "color 0.2s"
          }}
          onClick={logOut}
          type="button"
          onMouseEnter={(e) => e.target.style.color = "var(--error)"}
          onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
        >
          Sign out and use another account
        </button>
      </section>
    </main>
  );
}
