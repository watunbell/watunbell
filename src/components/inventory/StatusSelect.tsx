"use client";

import { useState } from "react";
import { STATUS_MAP, STATUSES } from "@/lib/constants";
import { updateItemStatus } from "@/lib/items";
import type { ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusSelectProps {
  itemId: string;
  status: ItemStatus;
}

/**
 * Inline dropdown that writes the new status straight to Firestore.
 * The real-time listener reflects the change everywhere; a brief pending
 * state gives local feedback while the write is in flight.
 */
export function StatusSelect({ itemId, status }: StatusSelectProps) {
  const [pending, setPending] = useState(false);
  const meta = STATUS_MAP[status];

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ItemStatus;
    if (next === status) return;
    setPending(true);
    try {
      await updateItemStatus(itemId, next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        onChange={onChange}
        disabled={pending}
        aria-label="Change status"
        className={cn(
          "cursor-pointer appearance-none rounded-md py-1 pl-2 pr-6 text-xs font-medium ring-1 ring-inset outline-none transition-opacity focus:ring-2",
          meta?.badgeClass,
          pending && "opacity-60",
        )}
      >
        {STATUSES.map((s) => (
          <option key={s.key} value={s.key} className="bg-white text-gray-900">
            {s.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 h-3 w-3 opacity-60"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
