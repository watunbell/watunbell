import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

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

// Reuse the app across HMR reloads / route transitions (Next.js re-evaluates
// modules), so we never call initializeApp twice.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);

// Wire up the local emulator once, on the client only.
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
) {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "localhost";
  const port = Number(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORT ?? 8080);
  // Guard against reconnecting on every fast-refresh.
  const w = window as unknown as { __FIRESTORE_EMULATOR__?: boolean };
  if (!w.__FIRESTORE_EMULATOR__) {
    connectFirestoreEmulator(db, host, port);
    w.__FIRESTORE_EMULATOR__ = true;
  }
}

export { app };
