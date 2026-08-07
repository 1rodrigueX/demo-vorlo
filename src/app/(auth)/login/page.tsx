"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Home } from "lucide-react";
import { login, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

function LoginForm() {
  const searchParams = useSearchParams();
  // Destino pós-login (ex.: voltar pro site institucional). Só caminho interno.
  const nextRaw = searchParams.get("next") ?? "";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";
  const confirmed = searchParams.get("confirmed") === "1";
  const wasReset = searchParams.get("reset") === "1";
  const confirmProblem = searchParams.get("confirm"); // 'expired' | 'invalid'

  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(login, null);
  const mfaRequired = state?.mfaRequired === true;
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-panel p-8 shadow-sm">
        <Link href="/" className="mb-5 inline-block">
          <Button type="button" variant="primary" size="sm" className="rounded-full">
            <Home size={14} /> Início
          </Button>
        </Link>
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Entrar</h1>
        <p className="mb-6 text-sm text-gray-500">Acesse sua conta Synexa.</p>

        {confirmed && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            E-mail confirmado! Agora é só entrar.
          </p>
        )}
        {wasReset && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Senha redefinida! Entre com a nova senha.
          </p>
        )}
        {confirmProblem && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            O link de confirmação {confirmProblem === "expired" ? "expirou" : "é inválido"}. Faça login para receber um novo.
          </p>
        )}

        {googleEnabled && (
          <>
            <GoogleAuthButton next={next || "/dashboard"} />
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">ou com e-mail</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" readOnly={mfaRequired} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <PasswordInput id="password" name="password" required autoComplete="current-password" />
          </div>

          {mfaRequired && (
            <div>
              <Label htmlFor="totp">Código de verificação</Label>
              <Input
                id="totp"
                name="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
                required
              />
              <p className="mt-1 text-xs text-gray-500">Digite o código de 6 dígitos do seu app autenticador.</p>
            </div>
          )}

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            {mfaRequired ? "Confirmar e entrar" : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/reset-password" className="text-gray-500 hover:text-gray-700 hover:underline">
            Esqueci minha senha
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-gray-500">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
