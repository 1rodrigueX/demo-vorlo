"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    signup,
    null,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Criar conta</h1>
        <p className="mb-6 text-sm text-gray-500">Cadastre-se para acessar o CRM da equipe.</p>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" name="fullName" type="text" required autoComplete="name" />
          </div>
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
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && <p className="text-sm text-green-600">{state.message}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Criar conta
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
