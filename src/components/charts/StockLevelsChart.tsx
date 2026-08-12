import { isLowStock } from "@/lib/items";
import type { InventoryItem } from "@/lib/types";

interface Props {
  items: InventoryItem[];
}

/** Horizontal meters: quantity vs. minimum, worst ratio first. Red = low stock. */
export function StockLevelsChart({ items }: Props) {
  const data = items
    .slice()
    .sort((a, b) => {
      const ra = a.minQuantity > 0 ? a.quantity / a.minQuantity : Infinity;
      const rb = b.minQuantity > 0 ? b.quantity / b.minQuantity : Infinity;
      return ra - rb;
    })
    .slice(0, 8);

  if (!data.length) {
    return (
      <div className="grid h-[200px] place-items-center text-sm text-gray-400">
        No items to chart yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const low = isLowStock(item);
        const pct =
          item.minQuantity > 0
            ? Math.min(100, (item.quantity / (item.minQuantity * 2)) * 100)
            : 100;
        return (
          <div key={item.id} className="grid grid-cols-[1fr_140px] items-center gap-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{item.name}</div>
              <div className="text-xs text-gray-400">
                จุดสั่งซื้อ {item.minQuantity} {item.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: low ? "#ef4444" : "#16a34a",
                  }}
                />
              </div>
              <span className="w-14 flex-shrink-0 text-right text-xs font-medium text-gray-500">
                {item.quantity}/{item.minQuantity}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
