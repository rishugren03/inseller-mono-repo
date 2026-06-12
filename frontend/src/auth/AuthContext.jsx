import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { setAuthTokenGetter, setOnUnauthorized } from "../lib/authToken";
import { fetchJson } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => auth.currentUser?.getIdToken() || null);

    setOnUnauthorized(async () => {
      await signOut(auth);
      setUser(null);
      setEmailVerified(false);
    });

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setEmailVerified(nextUser ? nextUser.emailVerified : false);
      setInitializing(false);

      if (!nextUser) return;

      // Only sync with backend if email is verified
      if (nextUser.emailVerified) {
        try {
          await fetchJson("/api/auth/me");
        } catch (error) {
          console.error("Unable to sync user with backend", error);
        }
      }
    });

    return () => {
      unsubscribe();
      setAuthTokenGetter(null);
      setOnUnauthorized(null);
    };
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const isVerified = auth.currentUser.emailVerified;
      if (isVerified) {
        // Force refresh ID token to get the updated email_verified claim
        await auth.currentUser.getIdToken(true);
        try {
          await fetchJson("/api/auth/me");
        } catch (error) {
          console.error("Unable to sync user with backend on verification", error);
        }
      }
      setUser(auth.currentUser);
      setEmailVerified(isVerified);
    }
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAuthenticated: Boolean(user),
      emailVerified,
      refreshUser,
    }),
    [initializing, user, emailVerified],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
