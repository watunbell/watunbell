"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { borrowItem } from "@/lib/loans";
import type { InventoryItem } from "@/lib/types";
import { Input, Label, Textarea } from "@/components/ui/Field";

interface BorrowFormProps {
  item: InventoryItem;
  onDone: () => void;
  onCancel: () => void;
}

export function BorrowForm({ item, onDone, onCancel }: BorrowFormProps) {
  const [borrower, setBorrower] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!borrower.trim()) {
      setError("Borrower is required.");
      return;
    }
    setSaving(true);
    try {
      await borrowItem({
        itemId: item.id,
        borrower: borrower.trim(),
        quantity: Number(quantity) || 1,
        dueDate: dueDate || null,
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record loan.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
        Borrowing <span className="font-semibold text-gray-900">{item.name}</span>
        {item.assetCode ? ` (${item.assetCode})` : ""}. The item will be marked{" "}
        <span className="font-medium">In-Use / Borrowed</span>.
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="borrower" required>
            Borrower (ผู้ยืม)
          </Label>
          <Input
            id="borrower"
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            placeholder="Student / staff name"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="borrow-qty">Quantity</Label>
          <Input
            id="borrow-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="due">Due date</Label>
          <Input
            id="due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="borrow-notes">Notes</Label>
          <Textarea
            id="borrow-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Record borrow
        </button>
      </div>
    </form>
  );
}
