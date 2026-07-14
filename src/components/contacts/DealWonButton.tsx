"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Trophy } from "lucide-react";
import { markDealWon } from "@/lib/actions/deals";
import { Button } from "@/components/ui/Button";

type DealStatus = "open" | "won" | "lost";

export function DealWonButton({
  dealId,
  initialStatus,
}: {
  dealId: string;
  initialStatus: DealStatus;
}) {
  const [status, setStatus] = useState<DealStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();

  if (status === "won") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 size={13} /> Venda ganha
      </span>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await markDealWon(dealId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setStatus("won");
        toast.success("Venda marcada como ganha!");
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      isLoading={isPending}
      onClick={handleClick}
      className="text-emerald-700 hover:bg-emerald-50"
    >
      <Trophy size={13} />
      Venda ganha
    </Button>
  );
}
