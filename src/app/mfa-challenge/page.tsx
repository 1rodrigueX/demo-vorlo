"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { verifyMfaChallenge, type MfaActionState } from "@/lib/actions/mfa";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export default function MfaChallengePage() {
  const [state, formAction, isPending] = useActionState<MfaActionState, FormData>(verifyMfaChallenge, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-panel p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <ShieldCheck size={22} />
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-gray-900">Verificação em duas etapas</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Digite o código gerado pelo seu app autenticador.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input id="code" name="code" inputMode="numeric" maxLength={6} autoFocus required />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Confirmar
          </Button>
        </form>
      </div>
    </div>
  );
}
