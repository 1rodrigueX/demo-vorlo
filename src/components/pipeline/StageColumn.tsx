"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { DealCard } from "@/components/pipeline/DealCard";
import type { DealWithContact, PipelineStage } from "@/types/domain";

export function StageColumn({
  stage,
  deals,
}: {
  stage: PipelineStage;
  deals: DealWithContact[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200/80 bg-gray-50/60">
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-gray-800">{stage.name}</span>
          <span className="rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
            {deals.length}
          </span>
        </div>
      </div>
      <p className="px-3.5 pb-2.5 text-xs font-medium text-gray-500">{formatCurrency(total)}</p>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-b-xl p-2.5 transition-colors",
          isOver && "bg-indigo-50",
        )}
        style={{ minHeight: 120 }}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
