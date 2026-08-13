import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StatCardSkeleton } from "@/components/erp/loading/StatCardSkeleton";

export type StatCardTone = "default" | "success" | "warning" | "danger";

const TONE_ICON_BG: Record<StatCardTone, string> = {
  default: "bg-[#ff5722]/10 text-[#ff5722]",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

/** Card de KPI — usado no Dashboard geral e nos dashboards setoriais (Estoque/Financeiro/Produção). */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  trend,
  isLoading,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: StatCardTone;
  trend?: { value: number; direction: "up" | "down" };
  isLoading?: boolean;
}) {
  if (isLoading) return <StatCardSkeleton />;

  return (
    <div className="rounded-xl border border-gray-200 bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
        </div>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE_ICON_BG[tone])}>
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
      </div>
      {trend && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            trend.direction === "up" ? "text-emerald-600" : "text-red-600",
          )}
        >
          {trend.direction === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {trend.value}% vs. período anterior
        </p>
      )}
    </div>
  );
}
