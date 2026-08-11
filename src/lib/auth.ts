import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

/** Only Google Workspace accounts on this domain may use the system. */
export const ALLOWED_DOMAIN = "g.swu.ac.th";

/** True if the email belongs to the allowed Workspace domain. */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

/**
 * Start the Google sign-in popup. `hd` hints Google to prefer the department
 * domain, but it is only a hint — real enforcement happens in `isAllowedEmail`
 * (client) and the Firestore security rules (server).
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    hd: ALLOWED_DOMAIN,
    prompt: "select_account",
  });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
