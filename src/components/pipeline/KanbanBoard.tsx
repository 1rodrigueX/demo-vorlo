"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toast } from "sonner";
import { StageColumn } from "@/components/pipeline/StageColumn";
import { updateDealStage } from "@/lib/actions/deals";
import type { DealWithContact, PipelineStage } from "@/types/domain";

export function KanbanBoard({
  stages,
  initialDeals,
}: {
  stages: PipelineStage[];
  initialDeals: DealWithContact[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const dealsByStage = useMemo(() => {
    const map = new Map<string, DealWithContact[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const deal of deals) {
      map.get(deal.stage_id)?.push(deal);
    }
    return map;
  }, [stages, deals]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const newStageId = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    const previousStageId = deal.stage_id;
    const newPosition = deals.filter((d) => d.stage_id === newStageId).length;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
    );

    const result = await updateDealStage({ dealId, stageId: newStageId, position: newPosition });

    if (result?.error) {
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: previousStageId } : d)),
      );
      toast.error(result.error);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn key={stage.id} stage={stage} deals={dealsByStage.get(stage.id) ?? []} />
        ))}
      </div>
    </DndContext>
  );
}
