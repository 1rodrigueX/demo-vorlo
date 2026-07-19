"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { submitBugReport, type ActionState } from "@/lib/actions/bug-reports";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";

export function BugReportForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(submitBugReport, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Bug reportado! Vamos olhar assim que possível.");
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="severity">Gravidade</Label>
        <Select id="severity" name="severity" defaultValue="media">
          <option value="baixa">Baixa — não atrapalha o uso</option>
          <option value="media">Média — incômodo, mas contorno existe</option>
          <option value="alta">Alta — trava o que eu preciso fazer</option>
          <option value="critica">Crítica — sistema fora do ar / perdendo dado</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="bug-message">O que aconteceu?</Label>
        <Textarea
          id="bug-message"
          name="message"
          rows={4}
          required
          placeholder="Descreva o problema: o que você tentou fazer, o que esperava, e o que aconteceu de errado..."
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" size="sm" isLoading={isPending}>
        Reportar bug
      </Button>
    </form>
  );
}
