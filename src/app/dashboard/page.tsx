"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  PackageX,
  CalendarClock,
  HandHelping,
  Wrench,
  Archive,
  Settings,
} from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useLoans } from "@/hooks/useLoans";
import { StatCard } from "@/components/StatCard";
import { ConfigNotice } from "@/components/ConfigNotice";
import { ChartCard } from "@/components/charts/ChartCard";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { StatusDonutChart } from "@/components/charts/StatusDonutChart";
import { StockLevelsChart } from "@/components/charts/StockLevelsChart";
import { MaintenanceChart } from "@/components/charts/MaintenanceChart";
import { DashboardSettingsPanel } from "@/components/DashboardSettingsPanel";
import { Modal } from "@/components/ui/Modal";
import { maintDueItems } from "@/lib/maintenance";
import { daysUntil, toDate } from "@/lib/utils";
import {
  DEFAULT_SETTINGS,
  PALETTES,
  loadDashboardSettings,
  saveDashboardSettings,
  type DashboardSettings,
} from "@/lib/dashboardSettings";

export default function DashboardPage() {
  const { items, stats, loading, error } = useItems();
  const { loans } = useLoans();

  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings are a per-browser display preference (localStorage), loaded once
  // on mount to avoid a server/client render mismatch.
  useEffect(() => {
    setSettings(loadDashboardSettings());
  }, []);

  function updateSettings(next: DashboardSettings) {
    setSettings(next);
    saveDashboardSettings(next);
  }

  const activeLoans = loans.filter((l) => l.status === "active");
  const overdueLoans = activeLoans.filter((l) => {
    const d = daysUntil(toDate(l.dueDate));
    return d !== null && d < 0;
  }).length;

  const brokenCount = stats.byStatus.broken ?? 0;
  const disposalCount = stats.byStatus.disposal ?? 0;
  const maintDueCount = maintDueItems(items, settings.maintWarnDays).length;

  const paletteColors = PALETTES[settings.palette].colors;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Live overview of department inventory &amp; equipment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Live
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Dashboard settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error ? <ConfigNotice message={error} /> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          label="Low Stock"
          value={loading ? "—" : stats.lowStockCount}
          hint="At or below minimum"
          icon={PackageX}
          tone={stats.lowStockCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Broken"
          value={loading ? "—" : brokenCount}
          hint="รอซ่อมบำรุง"
          icon={Wrench}
          tone={brokenCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Pending Disposal"
          value={loading ? "—" : disposalCount}
          hint="รอแทงจำหน่าย"
          icon={Archive}
          tone={disposalCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Maintenance Due"
          value={loading ? "—" : maintDueCount}
          hint={`ภายใน ${settings.maintWarnDays} วัน`}
          icon={CalendarClock}
          tone={maintDueCount > 0 ? "danger" : "default"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {settings.visible.byCategory ? (
          <ChartCard
            title="Items by Category"
            subtitle="Distinct items per asset category"
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <CategoryBarChart byCategory={stats.byCategory} colors={paletteColors} />
            )}
          </ChartCard>
        ) : null}

        {settings.visible.byStatus ? (
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
        ) : null}

        {settings.visible.stockLevels ? (
          <ChartCard
            title="ระดับคงคลัง"
            subtitle="คงเหลือ / จุดสั่งซื้อ — รายการที่ควรจับตาก่อน"
          >
            {loading ? <ChartSkeleton /> : <StockLevelsChart items={items} />}
          </ChartCard>
        ) : null}

        {settings.visible.maintenance ? (
          <ChartCard
            title="กำหนดบำรุงรักษาเครื่องมือ"
            subtitle={`แจ้งเตือนล่วงหน้า ${settings.maintWarnDays} วัน`}
          >
            {loading ? (
              <ChartSkeleton />
            ) : (
              <MaintenanceChart items={items} warnDays={settings.maintWarnDays} />
            )}
          </ChartCard>
        ) : null}
      </section>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="ตั้งค่าแดชบอร์ด"
        size="max-w-md"
      >
        <DashboardSettingsPanel settings={settings} onChange={updateSettings} />
      </Modal>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[280px] animate-pulse rounded-lg bg-gray-100" />;
}
