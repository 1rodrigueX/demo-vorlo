"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCompany, updateCompany, type ActionState } from "@/lib/actions/companies";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import type { Company } from "@/types/domain";

export function CompanyForm({
  company,
  onSaved,
}: {
  company?: Company;
  onSaved?: () => void;
}) {
  const action = company ? updateCompany.bind(null, company.id) : createCompany;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      onSaved?.();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSaved]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da empresa</Label>
        <Input id="name" name="name" required defaultValue={company?.name} />
      </div>
      <div>
        <Label htmlFor="website">Site</Label>
        <Input id="website" name="website" placeholder="https://" defaultValue={company?.website ?? ""} />
      </div>
      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={company?.notes ?? ""} />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        {company ? "Salvar alterações" : "Criar empresa"}
      </Button>
    </form>
  );
}
