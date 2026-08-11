import "server-only";
import { google } from "googleapis";
import type {
  InventoryItem,
  InventoryItemInput,
  Loan,
  LoanInput,
} from "./types";

/**
 * Google Sheets data layer (server-only).
 *
 * The sheet acts as the database: one tab (default "Items"), row 1 is the
 * header, every subsequent row is an item. Access uses a service account, so
 * the sheet is never exposed to end users directly — the Next.js API routes
 * gate every call behind an authenticated @g.swu.ac.th session.
 */

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const TAB = process.env.GOOGLE_SHEETS_TAB ?? "Items";
const LOANS_TAB = process.env.GOOGLE_SHEETS_LOANS_TAB ?? "Loans";

/** Column order in the sheet. Also the header row written by `ensureHeader`. */
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
] as const;

type Column = (typeof COLUMNS)[number];

/** True when the service-account + spreadsheet env is present. */
export function isSheetsConfigured(): boolean {
  return Boolean(
    SPREADSHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Private keys stored in env have literal "\n"; restore real newlines.
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// --- (de)serialization ----------------------------------------------------

function toRow(item: InventoryItem): string[] {
  const map: Record<Column, unknown> = {
    id: item.id,
    name: item.name,
    assetCode: item.assetCode ?? "",
    category: item.category,
    description: item.description ?? "",
    quantity: item.quantity,
    unit: item.unit,
    minQuantity: item.minQuantity,
    status: item.status,
    location: item.location ?? "",
    custodian: item.custodian ?? "",
    expiryDate: item.expiryDate ?? "",
    acquiredDate: item.acquiredDate ?? "",
    unitPrice: item.unitPrice ?? "",
    notes: item.notes ?? "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  return COLUMNS.map((c) => String(map[c] ?? ""));
}

function fromRow(row: string[]): InventoryItem {
  const get = (c: Column) => row[COLUMNS.indexOf(c)] ?? "";
  const num = (c: Column) => {
    const v = get(c);
    return v === "" ? undefined : Number(v);
  };
  const str = (c: Column) => {
    const v = get(c);
    return v === "" ? undefined : v;
  };
  return {
    id: get("id"),
    name: get("name"),
    assetCode: str("assetCode"),
    category: get("category") as InventoryItem["category"],
    description: str("description"),
    quantity: num("quantity") ?? 0,
    unit: get("unit") || "unit",
    minQuantity: num("minQuantity") ?? 0,
    status: (get("status") || "available") as InventoryItem["status"],
    location: str("location"),
    custodian: str("custodian"),
    expiryDate: str("expiryDate") ?? null,
    acquiredDate: str("acquiredDate") ?? null,
    unitPrice: num("unitPrice"),
    notes: str("notes"),
    createdAt: get("createdAt"),
    updatedAt: get("updatedAt"),
  };
}

// --- operations -----------------------------------------------------------

/** Read every item. Row 1 (header) is skipped. */
export async function listItems(): Promise<InventoryItem[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A2:Q`,
  });
  const rows = res.data.values ?? [];
  return rows
    .filter((r) => (r[0] ?? "").toString().trim() !== "")
    .map((r) => fromRow(r as string[]));
}

export async function createItem(
  input: InventoryItemInput,
): Promise<InventoryItem> {
  const sheets = getSheetsClient();
  const now = new Date().toISOString();
  const item: InventoryItem = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A:Q`,
    valueInputOption: "RAW",
    requestBody: { values: [toRow(item)] },
  });
  return item;
}

/** Find the 1-based sheet row number for an item id, or null if absent. */
async function findRowNumber(id: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A2:A`,
  });
  const ids = res.data.values ?? [];
  const idx = ids.findIndex((r) => (r[0] ?? "") === id);
  return idx === -1 ? null : idx + 2; // +2: header row + 1-based indexing
}

export async function updateItem(
  id: string,
  changes: Partial<InventoryItemInput>,
): Promise<InventoryItem | null> {
  const sheets = getSheetsClient();
  const rowNumber = await findRowNumber(id);
  if (rowNumber === null) return null;

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A${rowNumber}:Q${rowNumber}`,
  });
  const existing = fromRow((current.data.values?.[0] ?? []) as string[]);
  const merged: InventoryItem = {
    ...existing,
    ...changes,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A${rowNumber}:Q${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [toRow(merged)] },
  });
  return merged;
}

export async function getItemById(id: string): Promise<InventoryItem | null> {
  const items = await listItems();
  return items.find((i) => i.id === id) ?? null;
}

export async function deleteItem(id: string): Promise<boolean> {
  const sheets = getSheetsClient();
  const rowNumber = await findRowNumber(id);
  if (rowNumber === null) return false;

  // Resolve the numeric sheetId for the tab, required by deleteDimension.
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === TAB);
  const sheetId = sheet?.properties?.sheetId ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1, // 0-based, inclusive
              endIndex: rowNumber, // exclusive
            },
          },
        },
      ],
    },
  });
  return true;
}

/** Write the header row if the sheet is empty (used by the seed script). */
export async function ensureHeader(): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A1:Q1`,
  });
  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB}!A1:Q1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...COLUMNS]] },
    });
  }
}

// ===========================================================================
// Loans (borrow/return audit trail) — the `Loans` tab
// ===========================================================================

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

type LoanColumn = (typeof LOAN_COLUMNS)[number];

const LOAN_LAST_COL = "M"; // 13 columns → A..M

function loanToRow(loan: Loan): string[] {
  const map: Record<LoanColumn, unknown> = {
    id: loan.id,
    itemId: loan.itemId,
    itemName: loan.itemName,
    borrower: loan.borrower,
    quantity: loan.quantity,
    borrowedAt: loan.borrowedAt,
    dueDate: loan.dueDate ?? "",
    returnedAt: loan.returnedAt ?? "",
    status: loan.status,
    recordedBy: loan.recordedBy,
    notes: loan.notes ?? "",
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
  return LOAN_COLUMNS.map((c) => String(map[c] ?? ""));
}

function loanFromRow(row: string[]): Loan {
  const get = (c: LoanColumn) => row[LOAN_COLUMNS.indexOf(c)] ?? "";
  return {
    id: get("id"),
    itemId: get("itemId"),
    itemName: get("itemName"),
    borrower: get("borrower"),
    quantity: get("quantity") === "" ? 1 : Number(get("quantity")),
    borrowedAt: get("borrowedAt"),
    dueDate: get("dueDate") || null,
    returnedAt: get("returnedAt") || null,
    status: (get("status") || "active") as Loan["status"],
    recordedBy: get("recordedBy"),
    notes: get("notes") || undefined,
    createdAt: get("createdAt"),
    updatedAt: get("updatedAt"),
  };
}

/**
 * Make sure the Loans tab exists (with its header). Appending to a missing tab
 * fails, so this is called before any loan write.
 */
export async function ensureLoansSheet(): Promise<void> {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === LOANS_TAB,
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: LOANS_TAB } } }],
      },
    });
  }
  const header = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOANS_TAB}!A1:${LOAN_LAST_COL}1`,
  });
  if (!header.data.values || header.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${LOANS_TAB}!A1:${LOAN_LAST_COL}1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...LOAN_COLUMNS]] },
    });
  }
}

export async function listLoans(): Promise<Loan[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${LOANS_TAB}!A2:${LOAN_LAST_COL}`,
    });
    const rows = res.data.values ?? [];
    return rows
      .filter((r) => (r[0] ?? "").toString().trim() !== "")
      .map((r) => loanFromRow(r as string[]));
  } catch {
    // Tab not created yet → no loans recorded.
    return [];
  }
}

/**
 * Record a borrow: append a loan row and flip the item's status to "borrowed".
 * `recordedBy` is the acting staff email (from the session) — the audit stamp.
 */
export async function createLoan(
  input: LoanInput,
  recordedBy: string,
): Promise<Loan> {
  const item = await getItemById(input.itemId);
  if (!item) throw new Error("Item not found.");

  await ensureLoansSheet();
  const sheets = getSheetsClient();
  const now = new Date().toISOString();
  const loan: Loan = {
    id: crypto.randomUUID(),
    itemId: input.itemId,
    itemName: item.name,
    borrower: input.borrower,
    quantity: input.quantity ?? 1,
    borrowedAt: now.slice(0, 10),
    dueDate: input.dueDate ?? null,
    returnedAt: null,
    status: "active",
    recordedBy,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOANS_TAB}!A:${LOAN_LAST_COL}`,
    valueInputOption: "RAW",
    requestBody: { values: [loanToRow(loan)] },
  });

  // Keep item status in sync with the loan.
  await updateItem(input.itemId, { status: "borrowed" });
  return loan;
}

async function findLoanRowNumber(id: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOANS_TAB}!A2:A`,
  });
  const ids = res.data.values ?? [];
  const idx = ids.findIndex((r) => (r[0] ?? "") === id);
  return idx === -1 ? null : idx + 2;
}

/**
 * Record a return: mark the loan returned and flip the item back to
 * "available". `recordedBy` stamps who processed the return.
 */
export async function returnLoan(
  id: string,
  recordedBy: string,
): Promise<Loan | null> {
  const sheets = getSheetsClient();
  const rowNumber = await findLoanRowNumber(id);
  if (rowNumber === null) return null;

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOANS_TAB}!A${rowNumber}:${LOAN_LAST_COL}${rowNumber}`,
  });
  const existing = loanFromRow((current.data.values?.[0] ?? []) as string[]);
  if (existing.status === "returned") return existing;

  const now = new Date().toISOString();
  const updated: Loan = {
    ...existing,
    returnedAt: now.slice(0, 10),
    status: "returned",
    recordedBy,
    updatedAt: now,
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${LOANS_TAB}!A${rowNumber}:${LOAN_LAST_COL}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [loanToRow(updated)] },
  });

  await updateItem(existing.itemId, { status: "available" });
  return updated;
}
