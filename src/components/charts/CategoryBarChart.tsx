"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORIES } from "@/lib/constants";
import type { DashboardStats } from "@/lib/types";

interface Props {
  byCategory: DashboardStats["byCategory"];
  /** Optional palette override (cycled by index); falls back to each category's own color. */
  colors?: string[];
}

/** Bar chart: number of distinct items per asset category. */
export function CategoryBarChart({ byCategory, colors }: Props) {
  const data = CATEGORIES.map((c, i) => ({
    key: c.key,
    name: c.label,
    value: byCategory[c.key] ?? 0,
    color: colors && colors.length ? colors[i % colors.length] : c.color,
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 8 }}
        barCategoryGap="30%"
      >
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          interval={0}
          height={48}
          tickFormatter={(v: string) => wrapLabel(v)}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value} items`, "Count"]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Keep long category labels readable on the axis. */
function wrapLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
}

function EmptyChart() {
  return (
    <div className="grid h-[280px] place-items-center text-sm text-gray-400">
      No items to chart yet.
    </div>
  );
}
