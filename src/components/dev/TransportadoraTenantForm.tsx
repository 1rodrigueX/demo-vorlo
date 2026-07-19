"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTransportadoraTenant, type ActionState } from "@/lib/actions/dev-transportadora";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";

export function TransportadoraTenantForm({ onSaved }: { onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createTransportadoraTenant, null);
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
        <Label htmlFor="t-name">Nome da empresa</Label>
        <Input id="t-name" name="name" required placeholder="Ex: Transportes Silva" />
      </div>
      <div>
        <Label htmlFor="t-slug">Slug</Label>
        <Input id="t-slug" name="slug" required placeholder="ex: transportes-silva" />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Dono da empresa</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="t-ownerFullName">Nome completo</Label>
            <Input id="t-ownerFullName" name="ownerFullName" required />
          </div>
          <div>
            <Label htmlFor="t-ownerEmail">Email</Label>
            <Input id="t-ownerEmail" name="ownerEmail" type="email" required />
          </div>
          <div>
            <Label htmlFor="t-ownerPassword">Senha inicial</Label>
            <PasswordInput id="t-ownerPassword" name="ownerPassword" minLength={8} required />
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        Criar Transportadora
      </Button>
    </form>
  );
}
