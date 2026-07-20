"use client";

import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const INK_PRIMARY = "#ffffff";
const INK_MUTED = "#898781";
const TRACK = "#2c2c2a";

/** Mini tendência dentro de um stat tile — sem eixo, sem grid, só a forma. */
export function Sparkline({ data, color }: { data: { value: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${color})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export type DonutSlice = { name: string; value: number; color: string };

/** Donut com legenda lateral — usado em "Despesas no Mês/Ano". Aro fino, gap de 2px entre fatias (regra do skill). */
export function DonutChart({
  data,
  centerLabel,
  size = 96,
}: {
  data: DonutSlice[];
  centerLabel: string;
  size?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total > 0 ? data : [{ name: "Sem dados", value: 1, color: TRACK }]}
              dataKey="value"
              nameKey="name"
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={total > 0 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {(total > 0 ? data : [{ name: "Sem dados", value: 1, color: TRACK }]).map((slice, i) => (
                <Cell key={i} fill={slice.color} />
              ))}
            </Pie>
            {total > 0 && (
              <Tooltip
                formatter={(value, name) => [`${((Number(value) / total) * 100).toFixed(1)}%`, name]}
                contentStyle={{ background: "#1a1a19", border: "1px solid #383835", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: INK_PRIMARY }}
                itemStyle={{ color: INK_PRIMARY }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-1.5 text-xs text-[#c3c2b7]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="truncate">{slice.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gauge circular pequeno — "Participação na base anual". Um valor só, então sem legenda (regra do skill: legenda só a partir de 2 séries). */
export function MiniGauge({ label, percent, color }: { label: string; percent: number; color: string }) {
  const data = [
    { value: percent, color },
    { value: Math.max(0, 100 - percent), color: TRACK },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-16 w-16">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{percent.toFixed(0)}%</span>
        </div>
      </div>
      <span className="text-center text-[11px] text-[#898781]">{label}</span>
    </div>
  );
}

export { INK_PRIMARY, INK_MUTED, TRACK };
