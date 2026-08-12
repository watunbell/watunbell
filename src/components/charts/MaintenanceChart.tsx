import { daysUntil, maintDueItems, nextMaintDate } from "@/lib/maintenance";
import { formatDate } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";

interface Props {
  items: InventoryItem[];
  warnDays: number;
}

/** List of items due/overdue for maintenance, soonest first. */
export function MaintenanceChart({ items, warnDays }: Props) {
  const due = maintDueItems(items, warnDays).slice(0, 8);

  if (!due.length) {
    return (
      <div className="grid h-[160px] place-items-center text-sm text-gray-400">
        ไม่มีเครื่องมือที่ใกล้หรือถึงกำหนดบำรุงรักษา
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {due.map((item) => {
        const next = nextMaintDate(item);
        const days = daysUntil(next) ?? 0;
        const overdue = days < 0;
        return (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{item.name}</div>
              <div className="text-xs text-gray-400">
                {item.location ?? "—"} · กำหนดถัดไป {formatDate(next)}
              </div>
            </div>
            <span
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                overdue
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {overdue ? `เลยกำหนด ${Math.abs(days)} วัน` : `อีก ${days} วัน`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
