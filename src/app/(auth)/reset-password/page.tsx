"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { updatePassword, requestPasswordReset, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";

/** Com token no link (e-mail de reset / 1º acesso): define a nova senha. */
function SetNewPassword({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(updatePassword, null);

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Criar sua senha</h1>
      <p className="mb-6 text-sm text-gray-500">Defina a senha de acesso à sua conta.</p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput id="password" name="password" required autoComplete="new-password" showStrength />
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
    </>
  );
}

/** Sem token: pede o e-mail e envia o link de redefinição. */
function RequestReset() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(requestPasswordReset, null);

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Redefinir senha</h1>
      <p className="mb-6 text-sm text-gray-500">Enviamos um link para o seu e-mail redefinir a senha.</p>

      {state?.message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Enviar link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}

function ResetPasswordInner() {
  const token = useSearchParams().get("token");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-panel p-8 shadow-sm">
        {token ? <SetNewPassword token={token} /> : <RequestReset />}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
