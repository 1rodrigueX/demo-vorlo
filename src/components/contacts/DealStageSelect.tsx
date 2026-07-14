"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDealStage } from "@/lib/actions/deals";
import type { PipelineStage } from "@/types/domain";

export function DealStageSelect({
  dealId,
  currentStageId,
  stages,
}: {
  dealId: string;
  currentStageId: string;
  stages: PipelineStage[];
}) {
  const [stageId, setStageId] = useState(currentStageId);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStageId = e.target.value;
    const previous = stageId;
    setStageId(newStageId);

    startTransition(async () => {
      const result = await updateDealStage({ dealId, stageId: newStageId, position: 0 });
      if (result?.error) {
        setStageId(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <select
      value={stageId}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
      style={{
        backgroundColor: `${stages.find((s) => s.id === stageId)?.color ?? "#6366f1"}1a`,
        color: stages.find((s) => s.id === stageId)?.color ?? "#6366f1",
      }}
    >
      {stages.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
