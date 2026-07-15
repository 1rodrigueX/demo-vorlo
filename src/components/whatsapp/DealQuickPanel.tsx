"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Trophy } from "lucide-react";
import { setDealBudget, markProposalSent, markDealWon } from "@/lib/actions/deals";
import { Button } from "@/components/ui/Button";
import { formatRelative } from "@/lib/utils/dates";

type DealStatus = "open" | "won" | "lost";

export function DealQuickPanel({
  contactId,
  initialDeal,
}: {
  contactId: string;
  initialDeal: { id: string; value: number; status: DealStatus; proposalSentAt: string | null } | null;
}) {
  const [dealId, setDealId] = useState(initialDeal?.id ?? null);
  const [status, setStatus] = useState<DealStatus>(initialDeal?.status ?? "open");
  const [proposalSentAt, setProposalSentAt] = useState(initialDeal?.proposalSentAt ?? null);
  const [value, setValue] = useState(initialDeal ? String(initialDeal.value) : "");
  const [isSaving, startSaving] = useTransition();
  const [isMarking, startMarking] = useTransition();
  const [isClosing, startClosing] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      const result = await setDealBudget(contactId, dealId, Number(value) || 0);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.dealId) {
        setDealId(result.dealId);
        toast.success("Orçamento salvo");
      }
    });
  }

  function handleMarkProposalSent() {
    if (!dealId) return;
    startMarking(async () => {
      const result = await markProposalSent(dealId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setProposalSentAt(new Date().toISOString());
        toast.success("Proposta marcada como enviada");
      }
    });
  }

  function handleMarkWon() {
    if (!dealId) return;
    startClosing(async () => {
      const result = await markDealWon(dealId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setStatus("won");
        toast.success("Venda marcada como ganha!");
      }
    });
  }

  if (status === "won") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 size={15} />
        Venda ganha
      </span>
    );
  }

  if (proposalSentAt) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={15} />
          Proposta enviada {formatRelative(proposalSentAt)}
        </span>
        <Button
          type="button"
          size="sm"
          isLoading={isClosing}
          onClick={handleMarkWon}
          className="bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500"
        >
          <Trophy size={13} />
          Venda ganha
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex items-center gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          R$
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Orçamento"
          className="w-28 rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" isLoading={isSaving}>
        Salvar
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={handleMarkProposalSent}
        disabled={!dealId || isMarking}
        isLoading={isMarking}
        className="bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500"
      >
        Proposta enviada
      </Button>
      {dealId && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isLoading={isClosing}
          onClick={handleMarkWon}
          className="text-emerald-700 hover:bg-emerald-50"
        >
          <Trophy size={13} />
          Venda ganha
        </Button>
      )}
    </form>
  );
}
