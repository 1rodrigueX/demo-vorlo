"use client";

import { useActionState } from "react";
import { login, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    login,
    null,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-panel p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Entrar</h1>
        <p className="mb-6 text-sm text-gray-500">Acesse o CRM da equipe.</p>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
