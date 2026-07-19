"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import type { AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(updatePassword, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-panel p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Criar sua senha</h1>
        <p className="mb-6 text-sm text-gray-500">Defina a senha de acesso ao seu CRM.</p>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="password">Nova senha</Label>
            <PasswordInput id="password" name="password" required autoComplete="new-password" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" required autoComplete="new-password" />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Salvar e entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
