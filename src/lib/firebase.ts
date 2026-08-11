import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when the minimum config needed to talk to Firebase is present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

// Placeholder config used when the real env vars are absent (e.g. during the
// production build's static prerender). `getAuth()` throws on an empty API key,
// so we hand it a dummy value; all real auth/db calls stay gated behind
// `isFirebaseConfigured`, so nothing actually talks to this fake project.
const PLACEHOLDER_CONFIG = {
  apiKey: "placeholder-api-key",
  projectId: "placeholder-project",
};

// Reuse the app across HMR reloads / route transitions (Next.js re-evaluates
// modules), so we never call initializeApp twice.
const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(isFirebaseConfigured ? firebaseConfig : PLACEHOLDER_CONFIG);

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Wire up the local emulators once, on the client only.
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
) {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "localhost";
  const firestorePort = Number(
    process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORT ?? 8080,
  );
  const authPort = Number(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT ?? 9099,
  );
  // Guard against reconnecting on every fast-refresh.
  const w = window as unknown as { __FIREBASE_EMULATORS__?: boolean };
  if (!w.__FIREBASE_EMULATORS__) {
    connectFirestoreEmulator(db, host, firestorePort);
    connectAuthEmulator(auth, `http://${host}:${authPort}`, {
      disableWarnings: true,
    });
    w.__FIREBASE_EMULATORS__ = true;
  }
}

export { app };
