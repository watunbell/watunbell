import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type WithFieldValue,
} from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS, EXPIRING_SOON_DAYS } from "./constants";
import type {
  Category,
  DashboardStats,
  InventoryItem,
  InventoryItemInput,
  ItemStatus,
} from "./types";
import { daysUntil, toDate } from "./utils";

/**
 * Firestore converter so reads/writes are typed as InventoryItem end-to-end.
 * `id` is stripped on write (it is the doc id) and injected on read.
 */
const itemConverter: FirestoreDataConverter<InventoryItem> = {
  toFirestore(item: WithFieldValue<InventoryItem>): DocumentData {
    const { id, ...rest } = item as { id?: unknown } & DocumentData;
    void id;
    return rest;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): InventoryItem {
    const data = snapshot.data();
    return { id: snapshot.id, ...(data as Omit<InventoryItem, "id">) };
  },
};

const itemsCollection = () =>
  collection(db, COLLECTIONS.items).withConverter(itemConverter);

/**
 * Subscribe to the full items collection in real time.
 * Returns an unsubscribe function. This is the backbone of the live dashboard:
 * any create/update/delete on any client pushes here instantly.
 */
export function subscribeToItems(
  onData: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(itemsCollection(), orderBy("name"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data())),
    (err) => onError?.(err),
  );
}

export async function createItem(input: InventoryItemInput): Promise<string> {
  const ref = await addDoc(itemsCollection(), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as InventoryItem);
  return ref.id;
}

export async function updateItem(
  id: string,
  changes: Partial<InventoryItemInput>,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.items, id);
  await updateDoc(ref, { ...changes, updatedAt: serverTimestamp() });
}

/** Instant status change for a durable good (ครุภัณฑ์). */
export async function updateItemStatus(
  id: string,
  status: ItemStatus,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.items, id);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
}

export async function deleteItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.items, id));
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

/** Compute all dashboard aggregates from the live item list in one pass. */
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
