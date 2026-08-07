"use server";

import { redirect } from "next/navigation";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { resolveHomeRoute } from "@/lib/auth/current-user";
import {
  createTotpFactor,
  getFactorById,
  getVerifiedTotpFactor,
  listFactors,
  markFactorVerified,
  deleteFactor,
} from "@/lib/auth/db";

/**
 * MFA (TOTP) próprio, no lugar do supabase.auth.mfa. Segredo base32 gerado pelo
 * otplib e guardado em app_mfa_factors; QR em SVG (a UI injeta como HTML).
 */

export type MfaActionState = { error?: string } | null;
export type EnrollResult = { factorId: string; qrCode: string; secret: string } | { error: string };

authenticator.options = { window: 1 };

async function currentUserId(): Promise<{ id: string; email: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? "conta" };
}

/** Inicia o cadastro de um fator TOTP — devolve o QR (SVG) e o segredo pra digitar manualmente. */
export async function enrollMfa(): Promise<EnrollResult> {
  const user = await currentUserId();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const secret = authenticator.generateSecret();
  const factorId = await createTotpFactor(user.id, secret, null);
  const otpauth = authenticator.keyuri(user.email, "Synexa", secret);

  try {
    const qrCode = await QRCode.toString(otpauth, { type: "svg", margin: 1, width: 200 });
    return { factorId, qrCode, secret };
  } catch {
    return { error: "Não foi possível gerar o QR Code" };
  }
}

/** Confirma o cadastro com o código de 6 dígitos — só depois disso o fator fica ativo de verdade. */
export async function verifyMfaEnrollment(factorId: string, code: string): Promise<MfaActionState> {
  const user = await currentUserId();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const factor = await getFactorById(factorId, user.id);
  if (!factor) return { error: "Cadastro não encontrado. Recomece." };

  if (!authenticator.check(code.replace(/\D/g, ""), factor.secret)) {
    return { error: "Código inválido ou expirado. Tente de novo." };
  }

  await markFactorVerified(factorId);
  return null;
}

export async function unenrollMfa(factorId: string): Promise<MfaActionState> {
  const user = await currentUserId();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  await deleteFactor(factorId, user.id);
  return null;
}

export async function listMfaFactors(): Promise<{ id: string; friendly_name?: string | null }[]> {
  const user = await currentUserId();
  if (!user) return [];
  const factors = await listFactors(user.id);
  return factors
    .filter((f) => f.verified_at !== null)
    .map((f) => ({ id: f.id, friendly_name: f.friendly_name }));
}

/**
 * Tela /mfa-challenge. Com MFA de passo único (o código entra no login) esta
 * tela normalmente nem é alcançada; fica como defensiva: confere o código do
 * usuário já logado e o manda pra casa.
 */
export async function verifyMfaChallenge(_prevState: MfaActionState, formData: FormData): Promise<MfaActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Digite o código do app autenticador" };

  const user = await currentUserId();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const factor = await getVerifiedTotpFactor(user.id);
  if (!factor) return { error: "Nenhum fator de autenticação encontrado" };

  if (!authenticator.check(code.replace(/\D/g, ""), factor.secret)) {
    return { error: "Código inválido ou expirado. Tente de novo." };
  }

  redirect(await resolveHomeRoute());
}
