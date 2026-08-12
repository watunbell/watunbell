import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { isAllowedEmail } from "./constants";

/**
 * Resolve the current session and confirm it belongs to an allowed-domain user.
 * Returns the email on success, or null when unauthenticated / wrong domain.
 * API routes use this as their gate before touching the sheet.
 */
export async function requireAllowedUser(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return isAllowedEmail(email) ? (email as string) : null;
}
