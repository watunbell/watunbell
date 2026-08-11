"use client";

import { useItems } from "@/hooks/useItems";
import { ConfigNotice } from "@/components/ConfigNotice";
import { CATEGORY_MAP, STATUS_MAP } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { isLowStock } from "@/lib/items";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const { items, loading, error } = useItems();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">
          All department assets. Full create / edit / delete UI arrives with the
          next milestone.
        </p>
      </header>

      {error ? <ConfigNotice message={error} /> : null}

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No items yet.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const status = STATUS_MAP[item.status];
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.assetCode ? (
                        <div className="text-xs text-gray-400">{item.assetCode}</div>
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
                      >
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                          status?.badgeClass,
                        )}
                      >
                        {status?.label ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(item.expiryDate)}
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
