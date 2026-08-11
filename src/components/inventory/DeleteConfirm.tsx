"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { deleteItem } from "@/lib/items";
import type { InventoryItem } from "@/lib/types";

interface DeleteConfirmProps {
  item: InventoryItem | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirm({ item, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!item) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteItem(item.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title="Delete item"
      size="max-w-md"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm text-gray-700">
            Delete <span className="font-semibold">{item?.name}</span>? This
            cannot be undone.
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Delete
        </button>
      </div>
    </Modal>
  );
}
