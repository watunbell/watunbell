"use client";

import { useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { useLoans } from "@/hooks/useLoans";
import { ConfigNotice } from "@/components/ConfigNotice";
import { returnLoan } from "@/lib/loans";
import { formatDate, cn } from "@/lib/utils";
import { daysUntil, toDate } from "@/lib/utils";
import type { Loan, LoanStatus } from "@/lib/types";

type Filter = "all" | LoanStatus;

export default function LoansPage() {
  const { loans, loading, error } = useLoans();
  const [filter, setFilter] = useState<Filter>("active");
  const [returningId, setReturningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list =
      filter === "all" ? loans : loans.filter((l) => l.status === filter);
    // Most recent activity first.
    return [...list].sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
  }, [loans, filter]);

  const activeCount = loans.filter((l) => l.status === "active").length;

  async function handleReturn(loan: Loan) {
    setReturningId(loan.id);
    try {
      await returnLoan(loan.id);
    } finally {
      setReturningId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Loan History</h1>
        <p className="text-sm text-gray-500">
          Borrow / return audit trail.{" "}
          {loading ? "" : `${activeCount} currently on loan.`}
        </p>
      </header>

      {error ? <ConfigNotice message={error} /> : null}

      <div className="flex items-center gap-2">
        {(["active", "returned", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Borrower</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Borrowed</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Returned</th>
              <th className="px-4 py-3">Recorded by</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  No loans to show.
                </td>
              </tr>
            ) : (
              filtered.map((loan) => {
                const overdue =
                  loan.status === "active" &&
                  (daysUntil(toDate(loan.dueDate)) ?? 1) < 0;
                return (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {loan.itemName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{loan.borrower}</td>
                    <td className="px-4 py-3 text-gray-600">{loan.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(loan.borrowedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-gray-600",
                          overdue && "font-semibold text-red-600",
                        )}
                        title={overdue ? "Overdue" : undefined}
                      >
                        {formatDate(loan.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {loan.status === "returned" ? (
                        formatDate(loan.returnedAt)
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          On loan
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {loan.recordedBy}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {loan.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => handleReturn(loan)}
                          disabled={returningId === loan.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                          {returningId === loan.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Return
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
