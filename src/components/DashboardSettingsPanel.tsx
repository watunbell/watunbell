"use client";

import { CHART_DEFS, PALETTES, type DashboardSettings } from "@/lib/dashboardSettings";
import { cn } from "@/lib/utils";

interface Props {
  settings: DashboardSettings;
  onChange: (next: DashboardSettings) => void;
}

/** Dashboard display preferences: chart visibility, color palette, maintenance lead time. */
export function DashboardSettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">แสดงกราฟ</h3>
        <div className="space-y-1">
          {CHART_DEFS.map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={settings.visible[c.key]}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    visible: { ...settings.visible, [c.key]: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">ชุดสี (เฉพาะกราฟหมวดหมู่)</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map((key) => {
            const p = PALETTES[key];
            const selected = settings.palette === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ ...settings, palette: key })}
                className={cn(
                  "rounded-lg border p-2.5 text-left transition-colors",
                  selected
                    ? "border-brand-500 ring-2 ring-brand-500/20"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <div className="mb-1.5 flex gap-1">
                  {p.colors.slice(0, 6).map((c, i) => (
                    <span
                      key={i}
                      className="h-3 flex-1 rounded"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-700">{p.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          สีสถานะ (พร้อมใช้งาน/ชำรุด/รอแทงจำหน่าย ฯลฯ) คงที่เสมอเพื่อไม่ให้สับสน
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">แจ้งเตือนบำรุงรักษาล่วงหน้า</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={settings.maintWarnDays}
            onChange={(e) =>
              onChange({
                ...settings,
                maintWarnDays: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <span className="text-sm text-gray-500">วันก่อนถึงกำหนด</span>
        </div>
      </div>
    </div>
  );
}
