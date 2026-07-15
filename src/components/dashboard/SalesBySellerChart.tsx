"use client";

import { Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";

export type SellerSummary = { sellerId: string; name: string; value: number; count: number };

const BAR_COLORS = [
  "var(--color-indigo-600)",
  "var(--color-emerald-600)",
  "var(--color-amber-600)",
  "var(--color-sky-600)",
  "var(--color-red-600)",
];

export function SalesBySellerChart({ data }: { data: SellerSummary[] }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Users size={16} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Vendas por vendedor</h2>
      </div>
      {!data.length ? (
        <p className="py-8 text-center text-sm text-gray-500">Nenhuma venda ganha registrada ainda.</p>
      ) : (
        <div style={{ height: Math.max(160, data.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-gray-200)" horizontal={false} />
              <XAxis
                type="number"
                stroke="var(--color-gray-500)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--color-gray-500)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                cursor={{ fill: "var(--color-gray-100)" }}
                contentStyle={{
                  background: "var(--color-panel)",
                  border: "1px solid var(--color-gray-200)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: "var(--color-gray-900)" }}
                formatter={(value, _name, item) => {
                  const count = (item.payload as SellerSummary).count;
                  return [`${formatCurrency(Number(value))} (${count} venda${count === 1 ? "" : "s"})`, "Total ganho"];
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {data.map((entry, i) => (
                  <Cell key={entry.sellerId} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
