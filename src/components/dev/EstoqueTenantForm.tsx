"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEstoqueTenant, type ActionState } from "@/lib/actions/dev-estoque";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";

export function EstoqueTenantForm({ onSaved }: { onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createEstoqueTenant, null);
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
        <Label htmlFor="e-name">Nome da empresa</Label>
        <Input id="e-name" name="name" required placeholder="Ex: Depósito Silva" />
      </div>
      <div>
        <Label htmlFor="e-slug">Slug</Label>
        <Input id="e-slug" name="slug" required placeholder="ex: deposito-silva" />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Dono da empresa</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="e-ownerFullName">Nome completo</Label>
            <Input id="e-ownerFullName" name="ownerFullName" required />
          </div>
          <div>
            <Label htmlFor="e-ownerEmail">Email</Label>
            <Input id="e-ownerEmail" name="ownerEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="e-ownerPassword">Senha inicial</Label>
            <PasswordInput id="e-ownerPassword" name="ownerPassword" minLength={8} required showStrength />
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        Criar Controle de Estoque
      </Button>
    </form>
  );
}
