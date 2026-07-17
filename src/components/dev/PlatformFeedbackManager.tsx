"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { respondToPlatformFeedback, type ActionState } from "@/lib/actions/platform-feedback";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import type { PlatformFeedback } from "@/types/domain";

export function PlatformFeedbackManager({ feedback }: { feedback: PlatformFeedback[] }) {
  if (!feedback.length) {
    return <p className="p-8 text-center text-sm text-gray-500">Nenhum feedback enviado ainda.</p>;
  }

  return (
    <>
      {feedback.map((item) => (
        <FeedbackRow key={item.id} feedback={item} />
      ))}
    </>
  );
}

function FeedbackRow({ feedback }: { feedback: PlatformFeedback }) {
  const [replying, setReplying] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(respondToPlatformFeedback, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setReplying(false);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  const answered = feedback.status === "answered";

  return (
    <div className="space-y-2 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-900">{feedback.email}</span>
          <span>·</span>
          <span>{new Date(feedback.created_at).toLocaleString("pt-BR")}</span>
        </div>
        <Badge className={cn(answered ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {answered ? "Respondido" : "Novo"}
        </Badge>
      </div>

      <p className="whitespace-pre-wrap text-sm text-gray-800">{feedback.message}</p>

      {feedback.response && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sua resposta</p>
          {feedback.response}
        </div>
      )}

      {!replying && (
        <Button type="button" variant="secondary" size="sm" onClick={() => setReplying(true)}>
          {answered ? "Editar resposta" : "Responder"}
        </Button>
      )}

      {replying && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="feedbackId" value={feedback.id} />
          <Textarea name="response" rows={2} defaultValue={feedback.response ?? ""} required autoFocus />
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
