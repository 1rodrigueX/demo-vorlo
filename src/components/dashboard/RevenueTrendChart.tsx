"use client";

import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";

export type MonthlyRevenuePoint = { month: string; label: string; value: number };

export function RevenueTrendChart({ data }: { data: MonthlyRevenuePoint[] }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <TrendingUp size={16} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Receita ganha por mês</h2>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-gray-200)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--color-gray-500)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="var(--color-gray-500)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => formatCurrencyCompact(v)}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-gray-300)" }}
              contentStyle={{
                background: "var(--color-panel)",
                border: "1px solid var(--color-gray-200)",
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--color-gray-900)" }}
              formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-indigo-600)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--color-indigo-600)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
