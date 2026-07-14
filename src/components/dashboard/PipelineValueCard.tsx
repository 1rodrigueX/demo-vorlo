import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const colorClasses = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
} as const;

export function PipelineValueCard({
  label,
  value,
  isCurrency = true,
  icon: Icon,
  color = "indigo",
}: {
  label: string;
  value: number;
  isCurrency?: boolean;
  icon: LucideIcon;
  color?: keyof typeof colorClasses;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colorClasses[color])}>
          <Icon size={17} strokeWidth={2.25} />
        </div>
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tracking-tight text-gray-900")}>
        {isCurrency ? formatCurrency(value) : value.toLocaleString("pt-BR")}
      </p>
    </Card>
  );
}
