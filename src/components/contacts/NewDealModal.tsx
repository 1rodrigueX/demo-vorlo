"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createDeal, type ActionState } from "@/lib/actions/deals";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import type { PipelineStage } from "@/types/domain";

export function NewDealModal({
  contactId,
  stages,
}: {
  contactId: string;
  stages: PipelineStage[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createDeal, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      setOpen(false);
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Novo negócio
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo negócio">
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="contactId" value={contactId} />
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required placeholder="Ex: Contrato mensal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="stageId">Estágio</Label>
              <Select id="stageId" name="stageId" required defaultValue={stages[0]?.id ?? ""}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" name="value" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Criar negócio
          </Button>
        </form>
      </Modal>
    </>
  );
}
