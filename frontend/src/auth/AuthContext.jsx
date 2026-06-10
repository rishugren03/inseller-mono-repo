import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { setAuthTokenGetter } from "../lib/authToken";
import { fetchJson } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => auth.currentUser?.getIdToken() || null);

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setInitializing(false);

      if (!nextUser) return;

      try {
        await fetchJson("/api/auth/me");
      } catch (error) {
        console.error("Unable to sync user with backend", error);
      }
    });

    return () => {
      unsubscribe();
      setAuthTokenGetter(null);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAuthenticated: Boolean(user),
    }),
    [initializing, user],
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
