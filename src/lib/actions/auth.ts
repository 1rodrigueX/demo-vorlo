"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveHomeRoute } from "@/lib/auth/current-user";
import { loginSchema, updatePasswordSchema, signupSchema } from "@/lib/validation/auth";

export type AuthActionState = {
  error?: string;
  message?: string;
} | null;

/** Cadastro público (Google fica no botão à parte, via signInWithOAuth no client). Sem tenant_id no metadata — o trigger não cria profile, o usuário só vira dono de um CRM depois de escolher um plano em /choose-plan. */
export async function signup(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Esse e-mail já tem uma conta. Faça login." };
    }
    return { error: "Não foi possível criar sua conta. Tente novamente." };
  }

  // Com confirmação de email ativada no Supabase, signUp não retorna sessão —
  // tentar logar agora daria "Email ou senha incorretos" mesmo com a senha certa.
  if (!data.session) {
    return { message: "Conta criada! Enviamos um link de confirmação para o seu email — confirme antes de entrar." };
  }

  const plan = formData.get("plan");
  redirect(plan ? `/choose-plan?plan=${plan}` : "/choose-plan");
}

export async function login(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirme seu email antes de entrar. Verifique sua caixa de entrada (e o spam)." };
    }
    return { error: "Email ou senha incorretos" };
  }

  redirect(await resolveHomeRoute());
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Usada na primeira senha (link de acesso pós-compra) e em "esqueci minha senha". */
export async function updatePassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Link expirado ou inválido. Peça um novo acesso." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "Não foi possível salvar a senha. Tente novamente." };
  }

  redirect(await resolveHomeRoute());
}
