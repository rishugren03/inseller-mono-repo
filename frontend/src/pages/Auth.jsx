import { useState } from "react";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  sendVerification,
} from "../lib/firebase";

export default function Auth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "signup";

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (isSignUp) {
        const userCredential = await signUpWithEmail(email, password);
        await sendVerification(userCredential.user);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      setStatus({ type: "error", message: formatAuthError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setStatus(null);

    try {
      await signInWithGoogle();
    } catch (error) {
      setStatus({ type: "error", message: formatAuthError(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <div className="brand-mark">
            <img src="/favicon.svg" alt="Inseller Logo" width="32" height="32" />
            Inseller
          </div>
          <p>AI sales chat for Shopify</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Auth mode">
          <button
            className={mode === "signin" ? "active" : ""}
            onClick={() => setMode("signin")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
            type="button"
          >
            Create account
          </button>
        </div>

        <button
          className="button google-button"
          onClick={handleGoogleAuth}
          disabled={loading}
          type="button"
        >
          Continue with Google
        </button>

        <div className="auth-divider">or</div>

        <form onSubmit={handleEmailAuth} className="form-card auth-form">
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>
          <button
            className="button"
            type="submit"
            disabled={loading || !email.trim() || password.length < 6}
          >
            {loading
              ? "Working..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        {status && (
          <div className={`status-block ${status.type}`}>{status.message}</div>
        )}
      </section>
    </main>
  );
}

function formatAuthError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "That email is already registered.";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("popup-closed-by-user")) return "Google sign-in was closed.";
  if (code.includes("weak-password")) return "Use a stronger password.";
  return "Authentication failed. Please try again.";
}
