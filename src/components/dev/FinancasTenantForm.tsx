"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFinancasTenant, type ActionState } from "@/lib/actions/dev-financas";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";

export function FinancasTenantForm({ onSaved }: { onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createFinancasTenant, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      onSaved?.();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSaved]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="f-name">Nome da empresa</Label>
        <Input id="f-name" name="name" required placeholder="Ex: Financeira Silva" />
      </div>
      <div>
        <Label htmlFor="f-slug">Slug</Label>
        <Input id="f-slug" name="slug" required placeholder="ex: financeira-silva" />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Dono da empresa</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="f-ownerFullName">Nome completo</Label>
            <Input id="f-ownerFullName" name="ownerFullName" required />
          </div>
          <div>
            <Label htmlFor="f-ownerEmail">Email</Label>
            <Input id="f-ownerEmail" name="ownerEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="f-ownerPassword">Senha inicial</Label>
            <PasswordInput id="f-ownerPassword" name="ownerPassword" minLength={8} required showStrength />
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        Criar Controle de Finanças
      </Button>
    </form>
  );
}
