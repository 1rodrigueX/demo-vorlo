"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "@/lib/theme/ThemeContext";
import { CHART_CHROME, categoricalPalette } from "./palette";

export type DonutSlice = { label: string; value: number };

/** Donut — composição categórica (ex.: Vendas por status). Cores em ordem fixa; legenda sempre presente (≥2 categorias). */
export function DonutChart({
  data,
  height = 260,
  centerLabel,
}: {
  data: DonutSlice[];
  height?: number;
  centerLabel?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chrome = CHART_CHROME[isDark ? "dark" : "light"];
  const palette = categoricalPalette(isDark);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const tooltipStyle = {
    background: chrome.tooltipBg,
    border: `1px solid ${chrome.tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
    padding: "8px 12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => {
              const n = Number(value);
              return [`${n} (${total ? Math.round((n / total) * 100) : 0}%)`, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: chrome.mutedText }} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
          <span className="text-2xl font-semibold text-gray-900">{total}</span>
          <span className="text-xs text-gray-500">{centerLabel}</span>
        </div>
      )}
    </div>
  );
}
