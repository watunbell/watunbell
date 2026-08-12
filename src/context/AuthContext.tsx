"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export interface AuthUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

/**
 * Thin adapter over NextAuth's `useSession`, exposing the same shape the UI
 * used with the previous Firebase auth so components didn't need rewriting.
 * The @g.swu.ac.th domain restriction is enforced server-side in the NextAuth
 * `signIn` callback, so any session that exists here is already allowed.
 */
export function useAuth(): AuthValue {
  const { data: session, status } = useSession();

  const user: AuthUser | null = session?.user
    ? {
        displayName: session.user.name ?? null,
        email: session.user.email ?? null,
        photoURL: session.user.image ?? null,
      }
    : null;

  return {
    user,
    loading: status === "loading",
    signIn: () => signIn("google"),
    signOut: () => signOut(),
  };
}
