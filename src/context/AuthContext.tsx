"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  ALLOWED_DOMAIN,
  isAllowedEmail,
  signInWithGoogle,
  signOutUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** Domain / sign-in error to surface on the sign-in screen. */
  error: string | null;
  configured: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser && !isAllowedEmail(nextUser.email)) {
        // Someone authenticated with a non-department Google account.
        // Reject immediately so no session is established.
        await signOutUser();
        setUser(null);
        setError(
          `Access is restricted to @${ALLOWED_DOMAIN} accounts. You were signed out.`,
        );
        setLoading(false);
        return;
      }
      setUser(nextUser);
      if (nextUser) setError(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithGoogle();
      // onAuthStateChanged handles the domain check + state update.
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return; // user dismissed the popup — not an error worth showing
      }
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      configured: isFirebaseConfigured,
      signIn,
      signOut,
    }),
    [user, loading, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
