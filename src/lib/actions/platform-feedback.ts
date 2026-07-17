"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";

export type ActionState = { error?: string; message?: string } | null;

/** Mandado na aba "Feedback" da tela pós-cadastro — usuário já autenticado, ainda sem tenant. */
export async function submitPlatformFeedback(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Escreva sua mensagem antes de enviar" };
  if (message.length > 2000) return { error: "Mensagem muito longa (máx. 2000 caracteres)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Sessão expirada, faça login novamente" };

  const { error } = await supabase.from("platform_feedback").insert({
    user_id: user.id,
    email: user.email,
    message,
  });

  if (error) return { error: `Não foi possível enviar: ${error.message}` };
  return { message: "Recebemos sua mensagem! Vamos responder por e-mail em breve." };
}

/** Todo o feedback de visitantes (pré-cadastro) — só pro painel /dev. */
export async function listPlatformFeedback() {
  if (!(await isCurrentUserDev())) return [];

  const admin = createAdminClient();
  const { data } = await admin.from("platform_feedback").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function respondToPlatformFeedback(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const feedbackId = String(formData.get("feedbackId") ?? "");
  const response = String(formData.get("response") ?? "").trim();
  if (!feedbackId) return { error: "Feedback inválido" };
  if (!response) return { error: "Escreva uma resposta" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_feedback")
    .update({ response, status: "answered", responded_at: new Date().toISOString() })
    .eq("id", feedbackId);

  if (error) return { error: "Não foi possível salvar a resposta" };

  revalidatePath("/dev/feedback");
  return null;
}
