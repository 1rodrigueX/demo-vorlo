"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "@/lib/theme/ThemeContext";
import { CHART_CHROME, categoricalPalette } from "./palette";

type Point = Record<string, string | number>;
export type BarSeries = { key: string; label: string };

/** Gráfico de barras — comparação categórica (ex.: Financeiro entradas x saídas por mês). Cores em ordem fixa (slot 1, 2, ...). */
export function BarChartErp({
  data,
  xKey,
  series,
  height = 260,
  valueFormatter,
}: {
  data: Point[];
  xKey: string;
  series: BarSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chrome = CHART_CHROME[isDark ? "dark" : "light"];
  const palette = categoricalPalette(isDark);

  const tooltipStyle = {
    background: chrome.tooltipBg,
    border: `1px solid ${chrome.tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
    padding: "8px 12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={chrome.grid} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fill: chrome.mutedText, fontSize: 12 }} axisLine={{ stroke: chrome.axis }} tickLine={false} />
        <YAxis tick={{ fill: chrome.mutedText, fontSize: 12 }} axisLine={false} tickLine={false} width={56} tickFormatter={valueFormatter} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: chrome.mutedText, marginBottom: 4 }}
          formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : value)}
          cursor={{ fill: chrome.grid, opacity: 0.4 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: chrome.mutedText }} iconType="circle" iconSize={8} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
