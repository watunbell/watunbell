import type { Category, ItemStatus } from "./types";

export interface CategoryMeta {
  key: Category;
  label: string; // English
  labelTh: string; // Thai
  /** Whether items in this category should track an expiry date. */
  tracksExpiry: boolean;
  /** Tailwind-friendly hex used for charts. */
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "lab_equipment",
    label: "Lab Equipment",
    labelTh: "ครุภัณฑ์วิทยาศาสตร์",
    tracksExpiry: false,
    color: "#3366ff",
  },
  {
    key: "reagents_chemicals",
    label: "Reagents / Chemicals",
    labelTh: "สารเคมี / รีเอเจนต์",
    tracksExpiry: true,
    color: "#8b5cf6",
  },
  {
    key: "it_computing",
    label: "IT / Computing Devices",
    labelTh: "อุปกรณ์คอมพิวเตอร์",
    tracksExpiry: false,
    color: "#06b6d4",
  },
  {
    key: "office_supplies",
    label: "General Office Supplies",
    labelTh: "วัสดุสำนักงาน",
    tracksExpiry: false,
    color: "#f59e0b",
  },
];

export const CATEGORY_MAP: Record<Category, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<Category, CategoryMeta>;

export interface StatusMeta {
  key: ItemStatus;
  label: string;
  labelTh: string;
  color: string;
  /** Tailwind classes for badges. */
  badgeClass: string;
}

export const STATUSES: StatusMeta[] = [
  {
    key: "available",
    label: "Available",
    labelTh: "พร้อมใช้งาน",
    color: "#16a34a",
    badgeClass: "bg-green-100 text-green-800 ring-green-600/20",
  },
  {
    key: "borrowed",
    label: "In-Use / Borrowed",
    labelTh: "ถูกยืม / ใช้งาน",
    color: "#f59e0b",
    badgeClass: "bg-amber-100 text-amber-800 ring-amber-600/20",
  },
  {
    key: "low",
    label: "Low Stock",
    labelTh: "ใกล้หมด",
    color: "#d97706",
    badgeClass: "bg-amber-100 text-amber-800 ring-amber-600/20",
  },
  {
    key: "broken",
    label: "Broken",
    labelTh: "เสีย / ชำรุด",
    color: "#ef4444",
    badgeClass: "bg-red-100 text-red-800 ring-red-600/20",
  },
  {
    key: "disposal",
    label: "Pending Disposal",
    labelTh: "รอแทงจำหน่าย",
    color: "#d97706",
    badgeClass: "bg-amber-100 text-amber-800 ring-amber-600/20",
  },
  {
    key: "disposed",
    label: "Disposed",
    labelTh: "แทงจำหน่ายแล้ว",
    color: "#6b7280",
    badgeClass: "bg-gray-100 text-gray-700 ring-gray-500/20",
  },
];

export const STATUS_MAP: Record<ItemStatus, StatusMeta> = Object.fromEntries(
  STATUSES.map((s) => [s.key, s]),
) as Record<ItemStatus, StatusMeta>;

/** Number of days before expiry at which a reagent is flagged "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

/** Default lead time (days) before a maintenance due-date to start warning. */
export const DEFAULT_MAINT_WARN_DAYS = 30;

/**
 * Only Google Workspace accounts on this domain may use the system.
 * Overridable via env for other deployments. Keep this in sync with the
 * service account's access to the Google Sheet.
 */
export const ALLOWED_DOMAIN =
  process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? "g.swu.ac.th";

/** True if the email belongs to the allowed Workspace domain. */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}
