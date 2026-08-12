/**
 * Seed the Google Sheet with representative sample data (and a header row).
 *
 * Uses the same service account the app uses. Configure these in .env.local:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID
 * (Share the sheet with the service account email as an Editor.)
 *
 *   npm run seed
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { google } from "googleapis";

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
    // no .env.local — rely on ambient env
  }
}
loadEnv();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const TAB = process.env.GOOGLE_SHEETS_TAB ?? "Items";

const COLUMNS = [
  "id",
  "name",
  "assetCode",
  "category",
  "description",
  "quantity",
  "unit",
  "minQuantity",
  "status",
  "location",
  "custodian",
  "expiryDate",
  "acquiredDate",
  "unitPrice",
  "notes",
  "createdAt",
  "updatedAt",
  "maintEnabled",
  "maintIntervalMonths",
  "maintLastDate",
] as const;
const ITEMS_LAST_COL = "T"; // 20 columns → A..T

if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  console.error(
    "Missing GOOGLE_SHEETS_SPREADSHEET_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY in .env.local",
  );
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

const dateFromNow = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

type Sample = Record<string, string | number>;

const dateAgo = (n: number) => dateFromNow(-n);

const SAMPLE: Sample[] = [
  { name: "Compound Microscope (Olympus CX23)", assetCode: "SCI-LAB-001", category: "lab_equipment", quantity: 12, unit: "unit", minQuantity: 3, status: "available", location: "Lab 2-201", custodian: "อ.สมชาย", unitPrice: 45000, maintEnabled: "true", maintIntervalMonths: 12, maintLastDate: dateAgo(335) },
  { name: "Analytical Balance (0.1mg)", assetCode: "SCI-LAB-014", category: "lab_equipment", quantity: 2, unit: "unit", minQuantity: 2, status: "broken", location: "Lab 2-105", notes: "เสีย เพราะเซนเซอร์ชั่งน้ำหนักคลาดเคลื่อน", maintEnabled: "true", maintIntervalMonths: 6, maintLastDate: dateAgo(200) },
  { name: "Ethanol Absolute 99.9%", assetCode: "SCI-CHEM-023", category: "reagents_chemicals", quantity: 4, unit: "bottle", minQuantity: 6, status: "low", location: "Chem store A", expiryDate: dateFromNow(18) },
  { name: "Sodium Hydroxide (NaOH) pellets", assetCode: "SCI-CHEM-041", category: "reagents_chemicals", quantity: 9, unit: "bottle", minQuantity: 4, status: "available", location: "Chem store B", expiryDate: dateFromNow(400) },
  { name: "Dell OptiPlex Desktop", assetCode: "IT-PC-077", category: "it_computing", quantity: 1, unit: "unit", minQuantity: 1, status: "borrowed", location: "Staff room", custodian: "IT support", unitPrice: 22000 },
  { name: "Epson Projector EB-X06", assetCode: "IT-AV-012", category: "it_computing", quantity: 3, unit: "unit", minQuantity: 1, status: "available", location: "AV cabinet" },
  { name: "HP LaserJet Printer", assetCode: "IT-PR-030", category: "it_computing", quantity: 1, unit: "unit", minQuantity: 1, status: "disposal", location: "Office", unitPrice: 4200, notes: "รอแทงจำหน่าย เพราะหมดอายุการใช้งานเกิน 8 ปี" },
  { name: "Autoclave (old model)", assetCode: "SCI-LAB-005", category: "lab_equipment", quantity: 1, unit: "unit", minQuantity: 1, status: "disposed", location: "Storage", unitPrice: 85000, notes: "แทงจำหน่ายแล้วตามมติคณะกรรมการพัสดุ" },
  { name: "A4 Copy Paper (80gsm)", category: "office_supplies", quantity: 15, unit: "ream", minQuantity: 20, status: "low", location: "Office storeroom" },
  { name: "Whiteboard Markers (assorted)", category: "office_supplies", quantity: 40, unit: "pcs", minQuantity: 15, status: "available", location: "Office storeroom" },
];

const LOANS_TAB = process.env.GOOGLE_SHEETS_LOANS_TAB ?? "Loans";
const LOAN_COLUMNS = [
  "id",
  "itemId",
  "itemName",
  "borrower",
  "quantity",
  "borrowedAt",
  "dueDate",
  "returnedAt",
  "status",
  "recordedBy",
  "notes",
  "createdAt",
  "updatedAt",
] as const;

/** Build an item row and return both its generated id and the cell values. */
function buildItemRow(sample: Sample): { id: string; row: string[] } {
  const now = new Date().toISOString();
  const id = randomUUID();
  const full: Record<string, unknown> = { ...sample, id, createdAt: now, updatedAt: now };
  return { id, row: COLUMNS.map((c) => String(full[c] ?? "")) };
}

async function main() {
  console.log(`Seeding ${SAMPLE.length} items into sheet tab "${TAB}"…`);

  // Ensure the Items header row exists.
  const header = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A1:${ITEMS_LAST_COL}1`,
  });
  if (!header.data.values || header.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB}!A1:${ITEMS_LAST_COL}1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...COLUMNS]] },
    });
    console.log("  · wrote Items header row");
  }

  const built = SAMPLE.map((s) => ({ sample: s, ...buildItemRow(s) }));
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A:${ITEMS_LAST_COL}`,
    valueInputOption: "RAW",
    requestBody: { values: built.map((b) => b.row) },
  });
  for (const b of built) console.log(`  ✓ ${b.sample.name}`);

  // --- Loans tab: create it, add header, and one sample active loan --------
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  if (!meta.data.sheets?.some((s) => s.properties?.title === LOANS_TAB)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: LOANS_TAB } } }],
      },
    });
    console.log(`  · created "${LOANS_TAB}" tab`);
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOANS_TAB}!A1:M1`,
    valueInputOption: "RAW",
    requestBody: { values: [[...LOAN_COLUMNS]] },
  });

  // Match the sample loan to the item seeded with status "borrowed".
  const borrowed = built.find((b) => b.sample.status === "borrowed");
  if (borrowed) {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const due = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const loan: Record<string, unknown> = {
      id: randomUUID(),
      itemId: borrowed.id,
      itemName: borrowed.sample.name,
      borrower: "อ.วิภา (Physics)",
      quantity: 1,
      borrowedAt: today,
      dueDate: due,
      returnedAt: "",
      status: "active",
      recordedBy: "seed@" + (process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? "g.swu.ac.th"),
      notes: "Seeded sample loan",
      createdAt: now,
      updatedAt: now,
    };
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${LOANS_TAB}!A:M`,
      valueInputOption: "RAW",
      requestBody: { values: [LOAN_COLUMNS.map((c) => String(loan[c] ?? ""))] },
    });
    console.log(`  ✓ sample loan for ${borrowed.sample.name}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
