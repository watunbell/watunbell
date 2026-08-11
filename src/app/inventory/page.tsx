"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { ConfigNotice } from "@/components/ConfigNotice";
import { Modal } from "@/components/ui/Modal";
import { ItemForm } from "@/components/inventory/ItemForm";
import { StatusSelect } from "@/components/inventory/StatusSelect";
import { DeleteConfirm } from "@/components/inventory/DeleteConfirm";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/constants";
import { isExpiringSoon, isLowStock } from "@/lib/items";
import { downloadItemsCsv } from "@/lib/export";
import { cn, formatDate } from "@/lib/utils";
import type { Category, InventoryItem } from "@/lib/types";

export default function InventoryPage() {
  const { items, loading, error, configured } = useItems();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.assetCode?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.custodian?.toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${items.length} items`} · manage department
            assets in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadItemsCsv(filtered)}
            disabled={filtered.length === 0}
            title={
              filtered.length === 0
                ? "Nothing to export"
                : "Export current view to CSV"
            }
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!configured}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      </header>

      {error ? <ConfigNotice message={error} /> : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, location…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  {items.length === 0
                    ? "No items yet. Click “Add item” to create your first record."
                    : "No items match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const expiring = isExpiringSoon(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.assetCode ? (
                        <div className="text-xs text-gray-400">
                          {item.assetCode}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {CATEGORY_MAP[item.category]?.label ?? item.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          isLowStock(item) && "font-semibold text-amber-600",
                        )}
                        title={isLowStock(item) ? "Low stock" : undefined}
                      >
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect itemId={item.id} status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.location ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-gray-600",
                          expiring && "font-semibold text-red-600",
                        )}
                        title={expiring ? "Expiring soon" : undefined}
                      >
                        {formatDate(item.expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-600"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(item)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit item" : "Add item"}
      >
        <ItemForm
          key={editing?.id ?? "new"}
          item={editing ?? undefined}
          onDone={closeForm}
          onCancel={closeForm}
        />
      </Modal>

      {/* Delete confirmation */}
      <DeleteConfirm
        item={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => setDeleting(null)}
      />
    </div>
  );
}
