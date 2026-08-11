"use client";

import { Boxes, PackageX, CalendarClock, HandHelping } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useLoans } from "@/hooks/useLoans";
import { StatCard } from "@/components/StatCard";
import { ConfigNotice } from "@/components/ConfigNotice";
import { ChartCard } from "@/components/charts/ChartCard";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { StatusDonutChart } from "@/components/charts/StatusDonutChart";
import { daysUntil, toDate } from "@/lib/utils";

export default function DashboardPage() {
  const { stats, loading, error } = useItems();
  const { loans } = useLoans();

  const activeLoans = loans.filter((l) => l.status === "active");
  const overdueLoans = activeLoans.filter((l) => {
    const d = daysUntil(toDate(l.dueDate));
    return d !== null && d < 0;
  }).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Live overview of department inventory & equipment.
          </p>
        </div>
        {!loading && !error ? (
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
          label="On Loan"
          value={loading ? "—" : activeLoans.length}
          hint={overdueLoans > 0 ? `${overdueLoans} overdue` : "none overdue"}
          icon={HandHelping}
          tone={overdueLoans > 0 ? "danger" : "default"}
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
        <ChartCard
          title="Items by Category"
          subtitle="Distinct items per asset category"
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <CategoryBarChart byCategory={stats.byCategory} />
          )}
        </ChartCard>
        <ChartCard
          title="Status Distribution"
          subtitle="Equipment status across all items"
        >
          {loading ? (
            <ChartSkeleton />
          ) : (
            <StatusDonutChart byStatus={stats.byStatus} />
          )}
        </ChartCard>
      </section>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[280px] animate-pulse rounded-lg bg-gray-100" />
  );
}
