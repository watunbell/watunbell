"use client";

import { DEFAULT_MAINT_WARN_DAYS } from "./constants";

/** Chart cards the dashboard can show/hide, independent of each other. */
export type ChartKey =
  | "byCategory"
  | "byStatus"
  | "stockLevels"
  | "maintenance";

export const CHART_DEFS: { key: ChartKey; label: string }[] = [
  { key: "byCategory", label: "จำนวนรายการตามหมวดหมู่" },
  { key: "byStatus", label: "สัดส่วนตามสถานะ" },
  { key: "stockLevels", label: "ระดับคงคลัง (คงเหลือ / ขั้นต่ำ)" },
  { key: "maintenance", label: "กำหนดบำรุงรักษาเครื่องมือ" },
];

export type PaletteKey = "brand" | "pastel" | "vibrant" | "mono";

export const PALETTES: Record<PaletteKey, { label: string; colors: string[] }> = {
  brand: {
    label: "โทนหลัก (น้ำเงิน-ม่วง)",
    colors: ["#1f47f5", "#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"],
  },
  pastel: {
    label: "โทนพาสเทลอ่อน",
    colors: ["#7dd3fc", "#c4b5fd", "#5eead4", "#fde68a", "#fbcfe8", "#a7f3d0"],
  },
  vibrant: {
    label: "โทนสดใสตัดกัน",
    colors: ["#2563eb", "#db2777", "#16a34a", "#ea580c", "#7c3aed", "#0891b2"],
  },
  mono: {
    label: "โทนน้ำเงินเอกรงค์",
    colors: ["#12256b", "#1f47f5", "#5170ff", "#7f97ff", "#a8b9ff", "#c7d2ff"],
  },
};

export interface DashboardSettings {
  palette: PaletteKey;
  visible: Record<ChartKey, boolean>;
  maintWarnDays: number;
}

const STORAGE_KEY = "inv-dashboard-settings";

export const DEFAULT_SETTINGS: DashboardSettings = {
  palette: "brand",
  visible: {
    byCategory: true,
    byStatus: true,
    stockLevels: true,
    maintenance: true,
  },
  maintWarnDays: DEFAULT_MAINT_WARN_DAYS,
};

/**
 * Chart color palette is a personal display preference, not shared data, so it
 * lives in localStorage rather than the sheet — every signed-in user can pick
 * their own without affecting anyone else's view.
 */
export function loadDashboardSettings(): DashboardSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      palette: parsed.palette in PALETTES ? parsed.palette : DEFAULT_SETTINGS.palette,
      visible: { ...DEFAULT_SETTINGS.visible, ...(parsed.visible ?? {}) },
      maintWarnDays:
        typeof parsed.maintWarnDays === "number"
          ? parsed.maintWarnDays
          : DEFAULT_SETTINGS.maintWarnDays,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveDashboardSettings(settings: DashboardSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
