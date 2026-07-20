"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createDealAtStage, updateDealStage } from "@/lib/actions/deals";
import { cn } from "@/lib/utils/cn";
import type { PipelineStage } from "@/types/domain";

export function ContactStageCarousel({
  contactId,
  dealId: initialDealId,
  currentStageId,
  stages,
}: {
  contactId: string;
  dealId: string | null;
  currentStageId: string | null;
  stages: PipelineStage[];
}) {
  const [dealId, setDealId] = useState(initialDealId);
  const [stageId, setStageId] = useState(currentStageId);
  const [isPending, startTransition] = useTransition();

  function handleSelect(stage: PipelineStage) {
    if (isPending || stage.id === stageId) return;
    const previousStageId = stageId;
    setStageId(stage.id);

    startTransition(async () => {
      if (dealId) {
        const result = await updateDealStage({ dealId, stageId: stage.id, position: 0 });
        if (result?.error) {
          setStageId(previousStageId);
          toast.error(result.error);
        }
        return;
      }

      const result = await createDealAtStage(contactId, stage.id);
      if (result?.error) {
        setStageId(previousStageId);
        toast.error(result.error);
      } else if (result?.dealId) {
        setDealId(result.dealId);
      }
    });
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {stages.map((stage) => {
        const active = stage.id === stageId;
        return (
          <button
            key={stage.id}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(stage)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
              active ? "border-transparent text-white" : "border-gray-200 bg-panel text-gray-600 hover:bg-gray-50",
            )}
            style={active ? { backgroundColor: stage.color } : undefined}
          >
            {stage.name}
          </button>
        );
      })}
    </div>
  );
}
