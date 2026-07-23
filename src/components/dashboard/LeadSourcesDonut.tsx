"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import type { LeadSource } from "@/lib/dashboard/getConversationMetrics";

// Paleta alinhada aos canais/omnichannel (fase 2c) + fallbacks neutros.
const COLORS = [
  "var(--color-indigo-500)",
  "#25D366",
  "#1877F2",
  "#229ED9",
  "#f59e0b",
  "#ec4899",
  "var(--color-gray-400)",
];

export function LeadSourcesDonut({ data }: { data: LeadSource[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const top = data.slice(0, COLORS.length);

  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Fontes de lead</p>

      {total === 0 ? (
        <div className="flex h-[168px] items-center justify-center text-center text-xs text-gray-400">
          Dados insuficientes para exibir
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <div className="h-[150px] w-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={top}
                  dataKey="count"
                  nameKey="source"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="none"
                >
                  {top.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-panel)",
                    border: "1px solid var(--color-gray-200)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  labelStyle={{ color: "var(--color-gray-900)" }}
                  formatter={(value, name) => [`${Number(value)} lead(s)`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {top.map((d, i) => (
              <li key={d.source} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-gray-600">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate">{d.source}</span>
                </span>
                <span className="font-medium tabular-nums text-gray-900">
                  {Math.round((d.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
