"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { ConfigNotice } from "@/components/ConfigNotice";
import { Label, Select } from "@/components/ui/Field";
import { CATEGORIES, CATEGORY_MAP, STATUS_MAP, STATUSES } from "@/lib/constants";
import { isLowStock } from "@/lib/items";
import { downloadItemsCsv, reportFilename } from "@/lib/export";
import { formatDate, formatTHB } from "@/lib/utils";
import type { Category, InventoryItem, ItemStatus } from "@/lib/types";

type GroupBy = "none" | "category" | "location";
type SortKey = "name" | "code" | "location" | "quantity" | "unitPrice" | "totalValue" | "updatedAt";

const SORT_LABELS: Record<SortKey, string> = {
  name: "ชื่อเครื่องมือ",
  code: "เลขครุภัณฑ์",
  location: "สถานที่",
  quantity: "จำนวนคงเหลือ",
  unitPrice: "ราคาต่อชิ้น",
  totalValue: "มูลค่ารวม",
  updatedAt: "แก้ไขล่าสุด",
};

function sortValue(item: InventoryItem, key: SortKey): string | number {
  switch (key) {
    case "name":
      return item.name;
    case "code":
      return item.assetCode ?? "";
    case "location":
      return item.location ?? "";
    case "quantity":
      return item.quantity;
    case "unitPrice":
      return item.unitPrice ?? 0;
    case "totalValue":
      return (item.unitPrice ?? 0) * item.quantity;
    case "updatedAt":
      return item.updatedAt;
  }
}

export default function ReportPage() {
  const { items, loading, error } = useItems();

  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const locations = useMemo(
    () => [...new Set(items.map((i) => i.location).filter(Boolean) as string[])].sort(),
    [items],
  );

  const rows = useMemo(() => {
    let filtered = items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (locationFilter !== "all" && item.location !== locationFilter) return false;
      if (lowOnly && !isLowStock(item)) return false;
      return true;
    });
    filtered = filtered.slice().sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "th");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered;
  }, [items, categoryFilter, statusFilter, locationFilter, lowOnly, sortKey, sortDir]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ label: null as string | null, rows }];
    const keyFn =
      groupBy === "location"
        ? (i: InventoryItem) => i.location || "ไม่ระบุสถานที่"
        : (i: InventoryItem) => CATEGORY_MAP[i.category]?.label ?? i.category;
    const map = new Map<string, InventoryItem[]>();
    for (const item of rows) {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()].map(([label, groupRows]) => ({ label, rows: groupRows }));
  }, [rows, groupBy]);

  const totalValue = rows.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Report</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${rows.length} รายการ`} · กรอง / จัดกลุ่ม / เรียงลำดับ แล้วส่งออก
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadItemsCsv(rows, reportFilename("รายงานครุภัณฑ์"))}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          ส่งออกรายงาน (CSV)
        </button>
      </header>

      {error ? <ConfigNotice message={error} /> : null}

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <Label>หมวดหมู่</Label>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
          >
            <option value="all">ทุกหมวดหมู่</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.labelTh}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>สถานะ</Label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ItemStatus | "all")}
          >
            <option value="all">ทุกสถานะ</option>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.labelTh}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>สถานที่</Label>
          <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="all">ทุกสถานที่</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>จัดกลุ่มตาม</Label>
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
            <option value="none">ไม่จัดกลุ่ม</option>
            <option value="category">หมวดหมู่</option>
            <option value="location">สถานที่</option>
          </Select>
        </div>
        <div>
          <Label>เรียงตาม</Label>
          <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          เฉพาะของใกล้หมด
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            จำนวนรายการ
          </p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            จำนวนหน่วยรวม
          </p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {rows.reduce((sum, i) => sum + i.quantity, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            มูลค่ารวม
          </p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{formatTHB(totalValue)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <SortableTh label="ชื่อเครื่องมือ" sortKey="name" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-3">หมวดหมู่</th>
              <th className="px-4 py-3">สถานะ</th>
              <SortableTh label="สถานที่" sortKey="location" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableTh label="คงเหลือ" sortKey="quantity" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableTh label="ราคาต่อชิ้น" sortKey="unitPrice" active={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableTh label="มูลค่ารวม" sortKey="totalValue" active={sortKey} dir={sortDir} onClick={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  ไม่มีข้อมูลตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <GroupRows key={group.label ?? "all"} label={group.label} rows={group.rows} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({ label, rows }: { label: string | null; rows: InventoryItem[] }) {
  return (
    <>
      {label !== null ? (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-gray-600">
            {label} · {rows.length} รายการ
          </td>
        </tr>
      ) : null}
      {rows.map((item) => (
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
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_MAP[item.status]?.badgeClass ?? ""}`}
            >
              {STATUS_MAP[item.status]?.labelTh ?? item.status}
            </span>
          </td>
          <td className="px-4 py-3 text-gray-600">{item.location ?? "—"}</td>
          <td className="px-4 py-3 text-gray-600">
            {item.quantity} {item.unit}
          </td>
          <td className="px-4 py-3 text-gray-600">
            {item.unitPrice != null ? formatTHB(item.unitPrice) : "—"}
          </td>
          <td className="px-4 py-3 text-gray-600">
            {item.unitPrice != null ? formatTHB(item.unitPrice * item.quantity) : "—"}
          </td>
        </tr>
      ))}
    </>
  );
}

function SortableTh({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: "asc" | "desc";
  onClick: (key: SortKey) => void;
}) {
  const isActive = active === sortKey;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 hover:text-gray-700"
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </span>
    </th>
  );
}
