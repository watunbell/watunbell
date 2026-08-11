import { EXPIRING_SOON_DAYS } from "./constants";
import type {
  Category,
  DashboardStats,
  InventoryItem,
  InventoryItemInput,
  ItemStatus,
} from "./types";
import { daysUntil, toDate } from "./utils";

/**
 * Client-side data access. CRUD goes through the Next.js API routes (which gate
 * on the authenticated @g.swu.ac.th session and talk to Google Sheets); reads
 * are handled by `useItems` via polling. After any mutation we broadcast a
 * change event so the live view refreshes immediately, on top of the poll.
 */

const ITEMS_CHANGED = "items:changed";

export function onItemsChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ITEMS_CHANGED, handler);
  return () => window.removeEventListener(ITEMS_CHANGED, handler);
}

function notifyItemsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ITEMS_CHANGED));
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function fetchItems(): Promise<InventoryItem[]> {
  const res = await fetch("/api/items", { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return (data.items ?? []) as InventoryItem[];
}

export async function createItem(input: InventoryItemInput): Promise<string> {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const { item } = await res.json();
  notifyItemsChanged();
  return item.id as string;
}

export async function updateItem(
  id: string,
  changes: Partial<InventoryItemInput>,
): Promise<void> {
  const res = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error(await parseError(res));
  notifyItemsChanged();
}

/** Instant status change for a durable good (ครุภัณฑ์). */
export async function updateItemStatus(
  id: string,
  status: ItemStatus,
): Promise<void> {
  await updateItem(id, { status });
}

export async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
  notifyItemsChanged();
}

// --- Derived helpers (pure — safe to unit test) ---------------------------

export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.minQuantity;
}

export function isExpiringSoon(
  item: InventoryItem,
  withinDays = EXPIRING_SOON_DAYS,
): boolean {
  const d = daysUntil(toDate(item.expiryDate));
  return d !== null && d <= withinDays;
}

const EMPTY_STATUS: Record<ItemStatus, number> = {
  available: 0,
  borrowed: 0,
  maintenance: 0,
  retired: 0,
};

const EMPTY_CATEGORY: Record<Category, number> = {
  lab_equipment: 0,
  reagents_chemicals: 0,
  it_computing: 0,
  office_supplies: 0,
};

/** Compute all dashboard aggregates from the item list in one pass. */
export function computeStats(items: InventoryItem[]): DashboardStats {
  const byStatus = { ...EMPTY_STATUS };
  const byCategory = { ...EMPTY_CATEGORY };
  let totalUnits = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    totalUnits += item.quantity ?? 0;
    if (isLowStock(item)) lowStockCount += 1;
    if (isExpiringSoon(item)) expiringSoonCount += 1;
  }

  return {
    totalItems: items.length,
    totalUnits,
    lowStockCount,
    expiringSoonCount,
    byStatus,
    byCategory,
  };
}
