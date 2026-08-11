import "server-only";
import { google } from "googleapis";
import type { InventoryItem, InventoryItemInput } from "./types";

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
