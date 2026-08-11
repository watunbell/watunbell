import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ALLOWED_DOMAIN, isAllowedEmail } from "./constants";

/**
 * NextAuth configuration: Google sign-in restricted to the department's Google
 * Workspace domain. The `hd` param nudges Google's account picker toward the
 * domain, but the real gate is the `signIn` callback below — it rejects any
 * account whose email is not on the allowed domain, so no session is issued.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: { hd: ALLOWED_DOMAIN, prompt: "select_account" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile, user }) {
      const email = profile?.email ?? user?.email;
      return isAllowedEmail(email);
    },
  },
};
