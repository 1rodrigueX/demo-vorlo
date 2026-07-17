"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type { PeriodPreset } from "@/lib/dashboard/period";

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "custom", label: "Período personalizado" },
];

export function DashboardFiltersBar({
  sellers,
  period,
  from,
  to,
  ownerId,
}: {
  sellers: { id: string; name: string }[];
  period: PeriodPreset;
  from: string;
  to: string;
  ownerId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-panel p-3">
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => updateParams({ period: p.value === "month" ? null : p.value })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.value ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Calendar size={14} className="text-gray-400" />
          <input
            type="date"
            value={from}
            onChange={(e) => updateParams({ period: "custom", from: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          />
          <span>até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => updateParams({ period: "custom", to: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          />
        </div>
      )}

      <div className="ml-auto min-w-[180px]">
        <Select
          value={ownerId ?? ""}
          onChange={(e) => updateParams({ owner: e.target.value || null })}
          className="text-xs"
        >
          <option value="">Todos os vendedores</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
