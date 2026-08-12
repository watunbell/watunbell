"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { STATUSES } from "@/lib/constants";
import type { DashboardStats } from "@/lib/types";

interface Props {
  byStatus: DashboardStats["byStatus"];
}

/** Donut chart: distribution of items across status, with a total in the hole. */
export function StatusDonutChart({ byStatus }: Props) {
  const data = STATUSES.map((s) => ({
    key: s.key,
    name: s.label,
    value: byStatus[s.key] ?? 0,
    color: s.color,
  })).filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="grid h-[280px] place-items-center text-sm text-gray-400">
        No items to chart yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[220px] w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                const pct = Math.round((value / total) * 100);
                return [`${value} (${pct}%)`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-gray-900">{total}</span>
          <span className="text-xs text-gray-400">items</span>
        </div>
      </div>

      <ul className="w-full space-y-2 sm:w-1/2">
        {data.map((d) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <li key={d.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
              </span>
              <span className="font-medium text-gray-900">
                {d.value}
                <span className="ml-1 text-xs font-normal text-gray-400">
                  {pct}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
