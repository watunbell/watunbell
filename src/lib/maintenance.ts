import type { InventoryItem } from "./types";
import { toDate } from "./utils";

/** "ok" = not due yet, "soon" = within the warning window, "overdue" = past due. */
export type MaintStatus = "ok" | "soon" | "overdue";

/** Next maintenance due date (YYYY-MM-DD), or null if not on a schedule. */
export function nextMaintDate(item: InventoryItem): string | null {
  if (!item.maintEnabled || !item.maintLastDate) return null;
  const last = toDate(item.maintLastDate);
  if (!last) return null;
  const next = new Date(last);
  next.setMonth(next.getMonth() + (item.maintIntervalMonths || 12));
  return next.toISOString().slice(0, 10);
}

/** Whole days from now until `dateStr` (negative if in the past). */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = toDate(dateStr);
  if (!target) return null;
  const now = new Date();
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = target.getTime() - startOfNow.getTime();
  return Math.round(ms / 86_400_000);
}

export function maintStatusOf(
  item: InventoryItem,
  warnDays: number,
): MaintStatus | null {
  const next = nextMaintDate(item);
  if (next === null) return null;
  const days = daysUntil(next);
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days <= warnDays) return "soon";
  return "ok";
}

/** Items whose maintenance is due soon or overdue, soonest first. */
export function maintDueItems(
  items: InventoryItem[],
  warnDays: number,
): InventoryItem[] {
  return items
    .filter((it) => {
      const s = maintStatusOf(it, warnDays);
      return s === "soon" || s === "overdue";
    })
    .sort((a, b) => (daysUntil(nextMaintDate(a)) ?? 0) - (daysUntil(nextMaintDate(b)) ?? 0));
}
