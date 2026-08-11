import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Timestamp } from "firebase/firestore";

/** Merge Tailwind classes with conditional logic, de-duplicating conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert a Firestore Timestamp (or nullish) to a JS Date, or null. */
export function toDate(ts?: Timestamp | null): Date | null {
  if (!ts) return null;
  return typeof ts.toDate === "function" ? ts.toDate() : null;
}

/** Format a Firestore Timestamp / Date for display (locale-aware). */
export function formatDate(value?: Timestamp | Date | null): string {
  const d = value instanceof Date ? value : toDate(value ?? null);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

/** Whole days from now until `date`. Negative if already past. */
export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Format a number as Thai Baht. */
export function formatTHB(value?: number): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}
