"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTeamMember, type ActionState } from "@/lib/actions/tenant-settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

export function TeamMemberForm({ onSaved }: { onSaved?: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createTeamMember,
    null,
  );
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
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="password">Senha inicial</Label>
        <PasswordInput id="password" name="password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="role">Função</Label>
        <Select id="role" name="role" defaultValue="member">
          <option value="member">Vendedor</option>
          <option value="manager">Gestor</option>
        </Select>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        Criar acesso
      </Button>
    </form>
  );
}
