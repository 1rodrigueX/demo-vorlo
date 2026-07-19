"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveHomeRoute } from "@/lib/auth/current-user";

export type MfaActionState = { error?: string } | null;

export type EnrollResult = { factorId: string; qrCode: string; secret: string } | { error: string };

/** Inicia o cadastro de um fator TOTP — devolve o QR (SVG) e o segredo pra digitar manualmente. */
export async function enrollMfa(): Promise<EnrollResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível iniciar o cadastro" };
  }

  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Confirma o cadastro com o código de 6 dígitos do app autenticador — só depois disso o fator fica ativo de verdade. */
export async function verifyMfaEnrollment(factorId: string, code: string): Promise<MfaActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

  if (error) {
    return { error: "Código inválido ou expirado. Tente de novo." };
  }
  return null;
}

export async function unenrollMfa(factorId: string): Promise<MfaActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return { error: "Não foi possível desativar" };
  }
  return null;
}

export async function listMfaFactors() {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.filter((f) => f.status === "verified") ?? [];
}

/** Chamada pela tela /mfa-challenge após a senha (ou Google) já ter passado — completa a autenticação pro nível aal2. */
export async function verifyMfaChallenge(_prevState: MfaActionState, formData: FormData): Promise<MfaActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Digite o código do app autenticador" };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) return { error: "Nenhum fator de autenticação encontrado" };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) {
    return { error: "Código inválido ou expirado. Tente de novo." };
  }

  redirect(await resolveHomeRoute());
}
