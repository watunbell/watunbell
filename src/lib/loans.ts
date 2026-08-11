import type { Loan, LoanInput } from "./types";
import { notifyItemsChanged } from "./items";

/**
 * Client-side loan data access. Mutations broadcast both a loans change (to
 * refresh the history view) and an items change (borrow/return flips item
 * status), so every live view updates immediately on top of polling.
 */

const LOANS_CHANGED = "loans:changed";

export function onLoansChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LOANS_CHANGED, handler);
  return () => window.removeEventListener(LOANS_CHANGED, handler);
}

function notifyLoansChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LOANS_CHANGED));
  }
  notifyItemsChanged();
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function fetchLoans(): Promise<Loan[]> {
  const res = await fetch("/api/loans", { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return (data.loans ?? []) as Loan[];
}

/** Record a borrow. Also flips the item to "borrowed" server-side. */
export async function borrowItem(input: LoanInput): Promise<Loan> {
  const res = await fetch("/api/loans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const { loan } = await res.json();
  notifyLoansChanged();
  return loan as Loan;
}

/** Record a return. Also flips the item back to "available" server-side. */
export async function returnLoan(id: string): Promise<void> {
  const res = await fetch(`/api/loans/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "return" }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  notifyLoansChanged();
}
