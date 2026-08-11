"use client";

import { Boxes, PackageX, CalendarClock, Layers } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { StatCard } from "@/components/StatCard";
import { ConfigNotice } from "@/components/ConfigNotice";

export default function DashboardPage() {
  const { stats, loading, error, configured } = useItems();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Live overview of department inventory & equipment.
          </p>
        </div>
        {configured && !loading ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live
          </span>
        ) : null}
      </header>

      {error ? <ConfigNotice message={error} /> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Items"
          value={loading ? "—" : stats.totalItems}
          hint={`${stats.totalUnits} units on hand`}
          icon={Boxes}
        />
        <StatCard
          label="Categories"
          value={loading ? "—" : Object.values(stats.byCategory).filter(Boolean).length}
          hint="Active asset categories"
          icon={Layers}
        />
        <StatCard
          label="Low Stock Alerts"
          value={loading ? "—" : stats.lowStockCount}
          hint="At or below minimum"
          icon={PackageX}
          tone={stats.lowStockCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Expiring Soon"
          value={loading ? "—" : stats.expiringSoonCount}
          hint="Reagents within 30 days"
          icon={CalendarClock}
          tone={stats.expiringSoonCount > 0 ? "danger" : "default"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-400">
          Category breakdown (bar chart) — coming next
        </div>
        <div className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-400">
          Status distribution (donut chart) — coming next
        </div>
      </section>
    </div>
  );
}
