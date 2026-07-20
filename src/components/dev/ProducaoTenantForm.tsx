"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProducaoTenant, type ActionState } from "@/lib/actions/dev-producao";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";

export function ProducaoTenantForm({ onSaved }: { onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createProducaoTenant, null);
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
      <p className="text-xs text-gray-500">Cria a empresa com Produção e Estoque já ativos (Produção precisa dos dois).</p>
      <div>
        <Label htmlFor="p-name">Nome da empresa</Label>
        <Input id="p-name" name="name" required placeholder="Ex: Fábrica Silva" />
      </div>
      <div>
        <Label htmlFor="p-slug">Slug</Label>
        <Input id="p-slug" name="slug" required placeholder="ex: fabrica-silva" />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Dono da empresa</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="p-ownerFullName">Nome completo</Label>
            <Input id="p-ownerFullName" name="ownerFullName" required />
          </div>
          <div>
            <Label htmlFor="p-ownerEmail">Email</Label>
            <Input id="p-ownerEmail" name="ownerEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="p-ownerPassword">Senha inicial</Label>
            <PasswordInput id="p-ownerPassword" name="ownerPassword" minLength={8} required showStrength />
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        Criar Controle de Produção
      </Button>
    </form>
  );
}
