"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { submitSuggestion, type ActionState } from "@/lib/actions/suggestions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export function SuggestionForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(submitSuggestion, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Sugestão enviada!");
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <Textarea
        name="message"
        rows={3}
        required
        placeholder="Conte sua ideia ou o que poderia melhorar no CRM..."
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" size="sm" isLoading={isPending}>
        Enviar sugestão
      </Button>
    </form>
  );
}
