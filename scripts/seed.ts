/**
 * Seed the `items` collection with representative sample data.
 *
 * Usage:
 *   1. Configure .env.local (or point at the emulator with
 *      NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true).
 *   2. npm run seed
 *
 * Loads env from .env.local, then writes a handful of items across every
 * category and status so the dashboard has something to render.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase/app";
import {
  Timestamp,
  addDoc,
  collection,
  connectFirestoreEmulator,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";

// --- minimal .env.local loader (no dotenv dependency) ---------------------
function loadEnv() {
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env.local — rely on the emulator / ambient env
  }
}
loadEnv();

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-inventory",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "localhost";
  const port = Number(process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORT ?? 8080);
  connectFirestoreEmulator(db, host, port);
}

const daysFromNow = (n: number) =>
  Timestamp.fromDate(new Date(Date.now() + n * 24 * 60 * 60 * 1000));

const SAMPLE = [
  {
    name: "Compound Microscope (Olympus CX23)",
    assetCode: "SCI-LAB-001",
    category: "lab_equipment",
    quantity: 12,
    unit: "unit",
    minQuantity: 3,
    status: "available",
    location: "Lab 2-201",
    custodian: "อ.สมชาย",
    unitPrice: 45000,
  },
  {
    name: "Analytical Balance (0.1mg)",
    assetCode: "SCI-LAB-014",
    category: "lab_equipment",
    quantity: 2,
    unit: "unit",
    minQuantity: 2,
    status: "maintenance",
    location: "Lab 2-105",
  },
  {
    name: "Ethanol Absolute 99.9%",
    assetCode: "SCI-CHEM-023",
    category: "reagents_chemicals",
    quantity: 4,
    unit: "bottle",
    minQuantity: 6,
    status: "available",
    location: "Chem store A",
    expiryDate: daysFromNow(18),
  },
  {
    name: "Sodium Hydroxide (NaOH) pellets",
    assetCode: "SCI-CHEM-041",
    category: "reagents_chemicals",
    quantity: 9,
    unit: "bottle",
    minQuantity: 4,
    status: "available",
    location: "Chem store B",
    expiryDate: daysFromNow(400),
  },
  {
    name: "Dell OptiPlex Desktop",
    assetCode: "IT-PC-077",
    category: "it_computing",
    quantity: 1,
    unit: "unit",
    minQuantity: 1,
    status: "borrowed",
    location: "Staff room",
    custodian: "IT support",
    unitPrice: 22000,
  },
  {
    name: "Epson Projector EB-X06",
    assetCode: "IT-AV-012",
    category: "it_computing",
    quantity: 3,
    unit: "unit",
    minQuantity: 1,
    status: "available",
    location: "AV cabinet",
  },
  {
    name: "A4 Copy Paper (80gsm)",
    category: "office_supplies",
    quantity: 15,
    unit: "ream",
    minQuantity: 20,
    status: "available",
    location: "Office storeroom",
  },
  {
    name: "Whiteboard Markers (assorted)",
    category: "office_supplies",
    quantity: 40,
    unit: "pcs",
    minQuantity: 15,
    status: "available",
    location: "Office storeroom",
  },
] as const;

async function main() {
  const target =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true"
      ? "Firestore emulator"
      : `project "${app.options.projectId}"`;
  console.log(`Seeding ${SAMPLE.length} items into ${target}…`);

  for (const item of SAMPLE) {
    await addDoc(collection(db, "items"), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✓ ${item.name}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
