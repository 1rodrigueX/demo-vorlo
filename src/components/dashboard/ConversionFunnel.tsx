import { Target } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function ConversionFunnel({
  totalDeals,
  wonDeals,
}: {
  totalDeals: number;
  wonDeals: number;
}) {
  const rate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Target size={16} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Taxa de conversão</h2>
      </div>
      <div className="flex items-end gap-4">
        <span className="text-3xl font-semibold tracking-tight text-gray-900">{rate}%</span>
        <span className="pb-1 text-sm text-gray-500">
          {wonDeals} de {totalDeals} negócios ganhos
        </span>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
    </Card>
  );
}
