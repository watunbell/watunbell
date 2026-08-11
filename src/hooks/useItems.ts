"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToItems, computeStats } from "@/lib/items";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { DashboardStats, InventoryItem } from "@/lib/types";

interface UseItemsResult {
  items: InventoryItem[];
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  configured: boolean;
}

/**
 * Live view of the inventory. Attaches a Firestore snapshot listener on mount
 * so the whole UI re-renders the instant data changes on any client.
 */
export function useItems(): UseItemsResult {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setError(
        "Firebase is not configured. Copy .env.example to .env.local and add your project credentials.",
      );
      return;
    }

    const unsubscribe = subscribeToItems(
      (next) => {
        setItems(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => computeStats(items), [items]);

  return { items, stats, loading, error, configured: isFirebaseConfigured };
}
