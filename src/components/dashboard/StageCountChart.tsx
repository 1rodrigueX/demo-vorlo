import { KanbanSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";

export type StageSummary = {
  id: string;
  name: string;
  color: string;
  count: number;
  value: number;
};

export function StageCountChart({ stages }: { stages: StageSummary[] }) {
  const maxValue = Math.max(1, ...stages.map((s) => s.value));

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <KanbanSquare size={16} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Negócios por estágio</h2>
      </div>
      <div className="space-y-4">
        {stages.map((stage) => (
          <div key={stage.id}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium text-gray-800">
                {stage.name} <span className="text-gray-400">({stage.count})</span>
              </span>
              <span className="text-gray-500">{formatCurrency(stage.value)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(stage.value / maxValue) * 100}%`,
                  backgroundColor: stage.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
