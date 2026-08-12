import { CATEGORY_MAP, STATUS_MAP } from "./constants";
import { isExpiringSoon, isLowStock } from "./items";
import { nextMaintDate } from "./maintenance";
import type { InventoryItem } from "./types";
import { toDateInputValue } from "./utils";

/** A CSV column: header text + how to pull the cell value from an item. */
interface Column {
  header: string;
  value: (item: InventoryItem) => string | number;
}

/**
 * Report columns. Labels are human-readable; dates are ISO (yyyy-mm-dd) so they
 * sort correctly once imported into Google Sheets / Excel. Order is chosen to
 * read well in a faculty asset report.
 */
const COLUMNS: Column[] = [
  { header: "Name", value: (i) => i.name },
  { header: "Asset Code", value: (i) => i.assetCode ?? "" },
  { header: "Category", value: (i) => CATEGORY_MAP[i.category]?.label ?? i.category },
  { header: "Status", value: (i) => STATUS_MAP[i.status]?.label ?? i.status },
  { header: "Quantity", value: (i) => i.quantity },
  { header: "Unit", value: (i) => i.unit },
  { header: "Min Quantity", value: (i) => i.minQuantity },
  { header: "Low Stock", value: (i) => (isLowStock(i) ? "YES" : "") },
  { header: "Location", value: (i) => i.location ?? "" },
  { header: "Custodian", value: (i) => i.custodian ?? "" },
  { header: "Expiry Date", value: (i) => toDateInputValue(i.expiryDate) },
  { header: "Expiring Soon", value: (i) => (isExpiringSoon(i) ? "YES" : "") },
  { header: "Acquired Date", value: (i) => toDateInputValue(i.acquiredDate) },
  { header: "Unit Price (THB)", value: (i) => i.unitPrice ?? "" },
  { header: "Description", value: (i) => i.description ?? "" },
  { header: "Notes", value: (i) => i.notes ?? "" },
  { header: "Maintenance Interval (months)", value: (i) => (i.maintEnabled ? i.maintIntervalMonths ?? "" : "") },
  { header: "Last Maintenance", value: (i) => (i.maintEnabled ? toDateInputValue(i.maintLastDate) : "") },
  { header: "Next Maintenance Due", value: (i) => (i.maintEnabled ? nextMaintDate(i) ?? "" : "") },
];

/** Escape a single CSV cell per RFC 4180 (quote if it contains , " or newline). */
function escapeCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build an RFC 4180 CSV string from the given items (pure — easy to test). */
export function itemsToCsv(items: InventoryItem[]): string {
  const header = COLUMNS.map((c) => escapeCell(c.header)).join(",");
  const rows = items.map((item) =>
    COLUMNS.map((c) => escapeCell(c.value(item))).join(","),
  );
  return [header, ...rows].join("\r\n");
}

/** `inventory-report-2026-08-11.csv` */
export function reportFilename(prefix = "inventory-report"): string {
  const today = toDateInputValue(new Date());
  return `${prefix}-${today}.csv`;
}

/**
 * Trigger a client-side download of the items as CSV.
 * A UTF-8 BOM is prepended so Excel and Google Sheets detect the encoding and
 * render Thai (and other non-ASCII) text correctly.
 */
export function downloadItemsCsv(items: InventoryItem[], filename = reportFilename()): void {
  const csv = itemsToCsv(items);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
