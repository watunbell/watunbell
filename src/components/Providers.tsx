"use client";

import { SessionProvider } from "next-auth/react";

/** Client-side providers wrapper (NextAuth session context). */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
