/**
 * Asset categories handled by the department.
 * The value is the stable key stored in the sheet; labels for display live in
 * `constants.ts` (bilingual TH/EN).
 */
export type Category =
  | "lab_equipment" // Lab Equipment / ครุภัณฑ์วิทยาศาสตร์
  | "reagents_chemicals" // Reagents & Chemicals / สารเคมี (tracks expiry)
  | "it_computing" // IT / Computing Devices / อุปกรณ์คอมพิวเตอร์
  | "office_supplies"; // General Office Supplies / วัสดุสำนักงาน

/**
 * Real-time status of a durable good (ครุภัณฑ์).
 * Consumables (e.g. reagents, office supplies) typically stay "available" and
 * are governed by quantity / expiry instead of status.
 */
export type ItemStatus =
  | "available" // พร้อมใช้งาน
  | "borrowed" // ถูกยืม / กำลังใช้งาน (In-Use)
  | "maintenance" // ซ่อมบำรุง / ชำรุด (Maintenance / Broken)
  | "retired"; // ปลดระวาง / จำหน่ายออก

/**
 * A single inventory record — one row in the Google Sheet.
 * Dates are ISO strings because a spreadsheet stores everything as text:
 *  - `expiryDate` / `acquiredDate`: `YYYY-MM-DD`
 *  - `createdAt` / `updatedAt`: full ISO 8601 datetime
 */
export interface InventoryItem {
  id: string;

  // --- Identity -----------------------------------------------------------
  name: string;
  /** Department asset code / รหัสครุภัณฑ์ (e.g. "SCI-CHEM-001"). Optional. */
  assetCode?: string;
  category: Category;
  description?: string;

  // --- Stock & status -----------------------------------------------------
  /** On-hand quantity. Durable goods are usually 1; consumables can be many. */
  quantity: number;
  unit: string; // e.g. "unit", "box", "bottle", "ml"
  /** Threshold at or below which the item is flagged as low stock. */
  minQuantity: number;
  status: ItemStatus;

  // --- Location & ownership ----------------------------------------------
  location?: string; // Room / cabinet / shelf
  custodian?: string; // Person responsible / ผู้ดูแล

  // --- Category-specific --------------------------------------------------
  /** Expiry date (YYYY-MM-DD) — meaningful for `reagents_chemicals`. */
  expiryDate?: string | null;
  /** Purchase / acquisition date (YYYY-MM-DD). */
  acquiredDate?: string | null;
  /** Purchase cost in THB (for faculty asset reporting). */
  unitPrice?: number;

  // --- Bookkeeping --------------------------------------------------------
  notes?: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/**
 * Shape used when creating/updating an item. `id` is assigned server-side and
 * timestamps are set server-side, so they are excluded here.
 */
export type InventoryItemInput = Omit<
  InventoryItem,
  "id" | "createdAt" | "updatedAt"
>;

/** Aggregated numbers powering the dashboard cards + charts. */
export interface DashboardStats {
  totalItems: number;
  totalUnits: number;
  lowStockCount: number;
  expiringSoonCount: number;
  byStatus: Record<ItemStatus, number>;
  byCategory: Record<Category, number>;
}
