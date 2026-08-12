"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchLoans, onLoansChanged } from "@/lib/loans";
import type { Loan } from "@/lib/types";

const POLL_INTERVAL = 6000;

interface UseLoansResult {
  loans: Loan[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Live-ish view of the loan history (polls + refreshes on mutation). */
export function useLoans(): UseLoansResult {
  const { status } = useSession();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchLoans();
      setLoans(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loans.");
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
    const off = onLoansChanged(() => loadRef.current());
    return () => {
      clearInterval(interval);
      off();
    };
  }, [status]);

  return { loans, loading, error, refresh: load };
}
