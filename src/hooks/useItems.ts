"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { computeStats, fetchItems, onItemsChanged } from "@/lib/items";
import type { DashboardStats, InventoryItem } from "@/lib/types";

/** How often to poll the API for near-real-time updates (ms). */
const POLL_INTERVAL = 4000;

interface UseItemsResult {
  items: InventoryItem[];
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Live-ish view of the inventory. Polls the API every few seconds and also
 * refreshes immediately whenever this client mutates data (via the
 * `items:changed` event), approximating Firebase's real-time behaviour on top
 * of a Google Sheet.
 */
export function useItems(): UseItemsResult {
  const { status } = useSession();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fetch in a ref so the interval/event handlers stay stable.
  const load = useCallback(async () => {
    try {
      const next = await fetchItems();
      setItems(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (status !== "authenticated") return;

    loadRef.current();
    const interval = setInterval(() => loadRef.current(), POLL_INTERVAL);
    const off = onItemsChanged(() => loadRef.current());

    // Pause polling when the tab is hidden; refresh on return.
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      off();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status]);

  const stats = useMemo(() => computeStats(items), [items]);

  return { items, stats, loading, error, refresh: load };
}
