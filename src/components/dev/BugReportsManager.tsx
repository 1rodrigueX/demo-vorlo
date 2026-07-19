"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { respondToBugReport, type ActionState } from "@/lib/actions/bug-reports";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import type { BugReport } from "@/types/domain";

type BugReportWithTenant = BugReport & { tenant: { name: string } | null };

const SEVERITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export function BugReportsManager({ bugs }: { bugs: BugReportWithTenant[] }) {
  if (!bugs.length) {
    return <p className="p-8 text-center text-sm text-gray-500">Nenhum bug reportado ainda.</p>;
  }

  return (
    <>
      {bugs.map((bug) => (
        <BugReportRow key={bug.id} bug={bug} />
      ))}
    </>
  );
}

function BugReportRow({ bug }: { bug: BugReportWithTenant }) {
  const [replying, setReplying] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(respondToBugReport, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setReplying(false);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  const answered = bug.status === "answered";
  const isUrgent = bug.severity === "critica" || bug.severity === "alta";

  return (
    <div className="space-y-2 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-900">{bug.tenant?.name ?? "CRM removido"}</span>
          <span>·</span>
          <span>{bug.created_by_name ?? "usuário"}</span>
          <span>·</span>
          <span>{new Date(bug.created_at).toLocaleString("pt-BR")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn(isUrgent ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
            {SEVERITY_LABEL[bug.severity]}
          </Badge>
          <Badge className={cn(answered ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
            {answered ? "Respondido" : "Novo"}
          </Badge>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm text-gray-800">{bug.message}</p>

      {bug.response && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sua resposta</p>
          {bug.response}
        </div>
      )}

      {!replying && (
        <Button type="button" variant="secondary" size="sm" onClick={() => setReplying(true)}>
          {answered ? "Editar resposta" : "Responder"}
        </Button>
      )}

      {replying && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="bugId" value={bug.id} />
          <Textarea name="response" rows={2} defaultValue={bug.response ?? ""} required autoFocus />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" isLoading={isPending}>
              Salvar resposta
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setReplying(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
