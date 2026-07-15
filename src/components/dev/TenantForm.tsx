"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTenant, type ActionState } from "@/lib/actions/tenants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function TenantForm({ onSaved }: { onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createTenant, null);
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
        <Label htmlFor="name">Nome da empresa</Label>
        <Input id="name" name="name" required placeholder="Ex: Clínica Vida" />
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required placeholder="ex: clinica-vida" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="sellerLimit">Limite de vendedores</Label>
          <Input id="sellerLimit" name="sellerLimit" type="number" min={1} defaultValue={5} required />
        </div>
        <div>
          <Label htmlFor="managerLimit">Limite de gestores</Label>
          <Input id="managerLimit" name="managerLimit" type="number" min={0} defaultValue={2} required />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Dono do CRM
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ownerFullName">Nome completo</Label>
            <Input id="ownerFullName" name="ownerFullName" required />
          </div>
          <div>
            <Label htmlFor="ownerEmail">Email</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="ownerPassword">Senha inicial</Label>
            <Input id="ownerPassword" name="ownerPassword" type="password" minLength={6} required />
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        Criar CRM
      </Button>
    </form>
  );
}
