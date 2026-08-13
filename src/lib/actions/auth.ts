"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { authenticator } from "otplib";
import { signIn, signOut, auth } from "@/auth";
import { resolveHomeRoute } from "@/lib/auth/current-user";
import {
  getUserByEmail,
  verifyPassword,
  getVerifiedTotpFactor,
  createUser,
  updateUser,
  consumeAuthToken,
} from "@/lib/auth/db";
import { sendEmailVerification, sendPasswordReset } from "@/lib/auth/emails";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { loginSchema, updatePasswordSchema, signupSchema } from "@/lib/validation/auth";

const CAPTCHA_FIELD = "cf-turnstile-response";
const CAPTCHA_ERROR = "Verificação de segurança falhou. Recarregue a página e tente de novo.";

export type AuthActionState = {
  error?: string;
  message?: string;
  /** Login: usuário tem MFA — o formulário revela o campo do código TOTP. */
  mfaRequired?: boolean;
} | null;

authenticator.options = { window: 1 };

function safeNext(next: FormDataEntryValue | null): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/**
 * Cadastro público. Cria o usuário NÃO confirmado e manda o e-mail de
 * confirmação (nosso, via Resend). O usuário só entra depois de confirmar — daí
 * cai no /choose-plan (o plano viaja no link de confirmação).
 */
export async function signup(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  if (!(await verifyTurnstile(formData.get(CAPTCHA_FIELD) as string | null))) {
    return { error: CAPTCHA_ERROR };
  }

  const email = parsed.data.email.toLowerCase();
  if (await getUserByEmail(email)) {
    return { error: "Esse e-mail já tem uma conta. Faça login." };
  }

  let user;
  try {
    user = await createUser({ email, password: parsed.data.password, fullName: parsed.data.fullName, emailVerified: false });
  } catch {
    return { error: "Não foi possível criar sua conta. Tente novamente." };
  }

  const plan = formData.get("plan");
  const next = typeof plan === "string" && plan ? `/choose-plan?plan=${encodeURIComponent(plan)}` : "/choose-plan";
  const { error } = await sendEmailVerification({ userId: user.id, email, fullName: user.full_name }, next);
  if (error) {
    return { message: "Conta criada! Não consegui enviar o e-mail de confirmação agora — use 'esqueci minha senha' para receber o acesso." };
  }

  return { message: "Conta criada! Enviamos um link de confirmação para o seu e-mail — confirme antes de entrar." };
}

/**
 * Login por e-mail/senha (com MFA de passo único). Pré-checa aqui pra dar a UX
 * certa (revelar o campo do código), e o Auth.js reconfirma no authorize.
 */
export async function login(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  if (!(await verifyTurnstile(formData.get(CAPTCHA_FIELD) as string | null))) {
    return { error: CAPTCHA_ERROR };
  }

  const email = parsed.data.email.toLowerCase();
  const totp = String(formData.get("totp") ?? "").trim();

  const user = await getUserByEmail(email);
  const passwordOk = user ? await verifyPassword(user, parsed.data.password) : false;
  if (!user || !passwordOk) return { error: "E-mail ou senha incorretos" };
  if (!user.email_verified_at) {
    return { error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam)." };
  }

  const factor = await getVerifiedTotpFactor(user.id);
  if (factor) {
    if (!totp) return { mfaRequired: true };
    if (!authenticator.check(totp.replace(/\D/g, ""), factor.secret)) {
      return { mfaRequired: true, error: "Código de verificação inválido" };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      totp,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Não foi possível entrar. Tente novamente." };
    throw err; // erros de redirect do Next precisam propagar
  }

  const next = safeNext(formData.get("next"));
  redirect(next ?? (await resolveHomeRoute()));
}

/** Inicia o login com Google. O Auth.js processa o OAuth e cai em /auth/callback, que resolve o destino já logado. */
export async function loginWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const redirectTo = next ? `/auth/callback?next=${encodeURIComponent(next)}` : "/auth/callback";
  await signIn("google", { redirectTo });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

/**
 * Redefinir senha: por TOKEN (link do e-mail de reset / primeiro acesso) ou,
 * se o usuário já está logado, troca a própria senha.
 */
export async function updatePassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const token = String(formData.get("token") ?? "").trim();
  if (token) {
    const consumed = await consumeAuthToken(token, "password_reset");
    if (!consumed?.userId) return { error: "Link expirado ou inválido. Peça um novo acesso." };
    await updateUser(consumed.userId, { password: parsed.data.password, emailVerified: true });
    redirect("/login?reset=1");
  }

  const session = await auth();
  if (!session?.user?.id) return { error: "Link expirado ou inválido. Peça um novo acesso." };
  await updateUser(session.user.id, { password: parsed.data.password });
  redirect(await resolveHomeRoute());
}

/**
 * "Esqueci minha senha": manda o link de reset. Responde igual mesmo se o
 * e-mail não existir (não vaza quem tem conta).
 */
export async function requestPasswordReset(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Informe um e-mail válido" };

  const user = await getUserByEmail(email);
  if (user) await sendPasswordReset({ userId: user.id, email });

  return { message: "Se existir uma conta com esse e-mail, enviamos o link para redefinir a senha." };
}
