"use client";

import { useActionState, useEffect, useRef } from "react";
import { logActivity, type ActionState } from "@/lib/actions/activities";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export function ActivityComposer({ contactId }: { contactId: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    logActivity,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="contactId" value={contactId} />
      <div className="flex gap-2">
        <Select name="type" defaultValue="note" className="w-40 shrink-0">
          <option value="note">Nota</option>
          <option value="call">Ligação</option>
          <option value="follow_up">Follow-up</option>
        </Select>
        <Textarea name="body" placeholder="Escreva uma atualização..." rows={2} required className="flex-1" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" isLoading={isPending}>
          Registrar
        </Button>
      </div>
    </form>
  );
}
