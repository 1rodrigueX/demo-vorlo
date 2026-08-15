"use client";

import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/lib/theme/ThemeContext";
import { CHART_CHROME, SEQUENTIAL_BLUE, SEQUENTIAL_BLUE_FILL } from "./palette";

type Point = Record<string, string | number>;

/** Valores grandes compactos no eixo (R$ 500K em vez de R$ 500.000). */
function currencyCompact(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const NAMED_FORMATS = { currencyCompact } as const;

/**
 * Gráfico de linha/área — uma série de magnitude ao longo do tempo (ex.: Faturamento).
 *
 * `format` existe pra quem chama de um Server Component: função não
 * atravessa a fronteira server->client (o Next não serializa, e a página
 * inteira quebra com "A server error occurred" em runtime — foi o que
 * derrubou o Dashboard do ERP). Server Component passa a STRING; client
 * component pode continuar passando `valueFormatter` direto.
 */
export function LineAreaChart({
  data,
  xKey,
  valueKey,
  variant = "area",
  height = 260,
  valueFormatter,
  format,
}: {
  data: Point[];
  xKey: string;
  valueKey: string;
  variant?: "line" | "area";
  height?: number;
  valueFormatter?: (value: number) => string;
  format?: keyof typeof NAMED_FORMATS;
}) {
  const resolvedFormatter = valueFormatter ?? (format ? NAMED_FORMATS[format] : undefined);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chrome = CHART_CHROME[isDark ? "dark" : "light"];
  const stroke = SEQUENTIAL_BLUE[isDark ? "dark" : "light"];
  const fill = SEQUENTIAL_BLUE_FILL[isDark ? "dark" : "light"];

  const tooltipStyle = {
    background: chrome.tooltipBg,
    border: `1px solid ${chrome.tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
    padding: "8px 12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  };

  const Chart = variant === "line" ? LineChart : AreaChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="erp-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.55} />
            <stop offset="100%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={chrome.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tick={{ fill: chrome.mutedText, fontSize: 12 }}
          axisLine={{ stroke: chrome.axis }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: chrome.mutedText, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={resolvedFormatter}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: chrome.mutedText, marginBottom: 4 }}
          formatter={(value) => (resolvedFormatter ? resolvedFormatter(Number(value)) : value)}
          cursor={{ stroke: chrome.axis, strokeDasharray: "3 3" }}
        />
        {variant === "area" ? (
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke={stroke}
            strokeWidth={2}
            fill="url(#erp-area-fill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ) : (
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
