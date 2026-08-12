import { CATEGORIES, STATUSES } from "./constants";
import type { Category, InventoryItemInput, ItemStatus } from "./types";

/**
 * Import/export uses CSV rather than a binary .xlsx parser: Excel opens/saves
 * CSV natively, and it avoids taking a dependency on a third-party xlsx
 * parsing library (the available npm build of SheetJS carries unpatched
 * high-severity parsing vulnerabilities with no fix published to npm).
 */

export interface ImportField {
  key: keyof InventoryItemInput;
  label: string;
  required: boolean;
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: "assetCode", label: "เลขครุภัณฑ์", required: false },
  { key: "name", label: "ชื่อเครื่องมือ", required: true },
  { key: "category", label: "หมวดหมู่", required: true },
  { key: "location", label: "สถานที่", required: false },
  { key: "quantity", label: "จำนวนคงเหลือ", required: true },
  { key: "minQuantity", label: "จุดสั่งซื้อ", required: true },
  { key: "unit", label: "หน่วยนับ", required: false },
  { key: "status", label: "สถานะ", required: false },
  { key: "unitPrice", label: "ราคาต่อชิ้น", required: false },
  { key: "notes", label: "หมายเหตุ", required: false },
];

const CATEGORY_ALIASES: Record<Category, string[]> = {
  lab_equipment: ["ครุภัณฑ์วิทยาศาสตร์", "วิทยาศาสตร์", "แล็บ", "lab", "lab equipment", "laboratory"],
  reagents_chemicals: ["สารเคมี", "รีเอเจนต์", "เคมี", "chemical", "chemicals", "reagent", "reagents"],
  it_computing: ["คอมพิวเตอร์", "ไอที", "it", "computer", "computing", "อุปกรณ์คอมพิวเตอร์"],
  office_supplies: ["สำนักงาน", "วัสดุสำนักงาน", "office", "supplies", "office supplies"],
};

const STATUS_ALIASES: Record<ItemStatus, string[]> = {
  available: ["ใช้งานได้", "พร้อมใช้งาน", "ปกติ", "available", "ok", "normal"],
  borrowed: ["ถูกยืม", "ยืม", "borrowed", "in-use", "in use"],
  low: ["ใกล้หมด", "สต๊อกต่ำ", "low", "low stock", "running low"],
  broken: ["เสีย", "ชำรุด", "เสีย/ชำรุด", "broken", "damaged"],
  disposal: ["รอแทงจำหน่าย", "รอจำหน่าย", "pending disposal", "awaiting disposal"],
  disposed: ["แทงจำหน่ายแล้ว", "จำหน่ายแล้ว", "ปลดระวางแล้ว", "ปลดระวาง", "disposed", "retired", "written off"],
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function matchCategory(raw: string): Category | null {
  const n = normalize(raw);
  if (!n) return null;
  for (const key of Object.keys(CATEGORY_ALIASES) as Category[]) {
    if (CATEGORY_ALIASES[key].some((a) => normalize(a) === n || n.includes(normalize(a)))) return key;
  }
  return null;
}

export function matchStatus(raw: string): ItemStatus | null {
  const n = normalize(raw);
  if (!n) return null;
  for (const key of Object.keys(STATUS_ALIASES) as ItemStatus[]) {
    if (STATUS_ALIASES[key].some((a) => normalize(a) === n || n.includes(normalize(a)))) return key;
  }
  return null;
}

/** Guess which import field a spreadsheet column header refers to. */
export function matchField(header: string): ImportField["key"] | null {
  const n = normalize(header);
  const aliases: Record<string, ImportField["key"]> = {
    เลขครุภัณฑ์: "assetCode",
    assetcode: "assetCode",
    code: "assetCode",
    ชื่อเครื่องมือ: "name",
    ชื่อ: "name",
    name: "name",
    หมวดหมู่: "category",
    category: "category",
    สถานที่: "location",
    location: "location",
    จำนวนคงเหลือ: "quantity",
    คงเหลือ: "quantity",
    quantity: "quantity",
    qty: "quantity",
    จุดสั่งซื้อ: "minQuantity",
    minquantity: "minQuantity",
    reorder: "minQuantity",
    หน่วยนับ: "unit",
    unit: "unit",
    สถานะ: "status",
    status: "status",
    ราคาต่อชิ้น: "unitPrice",
    unitprice: "unitPrice",
    price: "unitPrice",
    หมายเหตุ: "notes",
    note: "notes",
    notes: "notes",
  };
  for (const [alias, key] of Object.entries(aliases)) {
    if (normalize(alias) === n) return key;
  }
  return null;
}

/** Minimal RFC-4180 CSV parser: handles quoted fields, escaped quotes, CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, ""); // strip BOM if present

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface ImportRow {
  index: number;
  input: Partial<InventoryItemInput>;
  errors: string[];
}

/** Parse CSV rows into validated item inputs, using auto-detected column mapping. */
export function buildImportRows(
  headerRow: string[],
  dataRows: string[][],
  mapping: Record<number, ImportField["key"] | null>,
): ImportRow[] {
  return dataRows.map((cells, i) => {
    const raw: Partial<Record<ImportField["key"], string>> = {};
    headerRow.forEach((_, colIdx) => {
      const field = mapping[colIdx];
      if (field) raw[field] = cells[colIdx] ?? "";
    });

    const errors: string[] = [];
    const name = (raw.name ?? "").trim();
    if (!name) errors.push("ไม่มีชื่อเครื่องมือ");

    const categoryRaw = (raw.category ?? "").trim();
    const category = matchCategory(categoryRaw) ?? (CATEGORIES.some((c) => c.key === categoryRaw) ? (categoryRaw as Category) : null);
    if (!category) errors.push("ไม่พบหมวดหมู่ที่ตรงกัน");

    const quantity = Number(raw.quantity ?? 0);
    if (Number.isNaN(quantity) || quantity < 0) errors.push("จำนวนคงเหลือไม่ถูกต้อง");

    const minQuantity = Number(raw.minQuantity ?? 0);

    const statusRaw = (raw.status ?? "").trim();
    const status: ItemStatus =
      matchStatus(statusRaw) ?? (STATUSES.some((s) => s.key === statusRaw) ? (statusRaw as ItemStatus) : "available");

    const unitPrice = raw.unitPrice ? Number(raw.unitPrice) : undefined;

    return {
      index: i,
      input: {
        assetCode: raw.assetCode?.trim() || undefined,
        name,
        category: category ?? undefined,
        location: raw.location?.trim() || undefined,
        quantity: Number.isNaN(quantity) ? 0 : quantity,
        minQuantity: Number.isNaN(minQuantity) ? 0 : minQuantity,
        unit: raw.unit?.trim() || "unit",
        status,
        unitPrice: unitPrice != null && !Number.isNaN(unitPrice) ? unitPrice : undefined,
        notes: raw.notes?.trim() || undefined,
      } as Partial<InventoryItemInput>,
      errors,
    };
  });
}
