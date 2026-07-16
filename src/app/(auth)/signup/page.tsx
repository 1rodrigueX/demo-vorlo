"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signup, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(signup, null);
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-panel p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Criar conta</h1>
        <p className="mb-6 text-sm text-gray-500">
          Crie sua conta no FALA AI CRM — escolha o plano depois de conhecer a plataforma.
        </p>

        <GoogleAuthButton next={plan ? `/choose-plan?plan=${plan}` : "/choose-plan"} />

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">ou com e-mail</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form action={formAction} className="space-y-4">
          {plan && <input type="hidden" name="plan" value={plan} />}
          <div>
            <Label htmlFor="fullName">Seu nome</Label>
            <Input id="fullName" name="fullName" required autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required autoComplete="new-password" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Criar minha conta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
