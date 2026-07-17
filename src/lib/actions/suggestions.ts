"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId, isCurrentUserDev } from "@/lib/auth/current-user";

export type ActionState = { error?: string } | null;

export async function submitSuggestion(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Escreva sua sugestão antes de enviar" };
  if (message.length > 2000) return { error: "Sugestão muito longa (máx. 2000 caracteres)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const { error } = await supabase.from("suggestions").insert({
    tenant_id: tenantId,
    created_by: user.id,
    created_by_name: profile?.full_name ?? user.email ?? null,
    message,
  });

  if (error) return { error: `Não foi possível enviar: ${error.message}` };

  revalidatePath("/sugestoes");
  return null;
}

/** Sugestões do próprio tenant (pra tela /sugestoes ver o histórico e respostas). */
export async function listOwnSuggestions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("suggestions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** Todas as sugestões de todos os tenants — só pro painel /dev. */
export async function listAllSuggestions() {
  if (!(await isCurrentUserDev())) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("suggestions")
    .select("*, tenant:tenants(name)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function respondToSuggestion(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const suggestionId = String(formData.get("suggestionId") ?? "");
  const response = String(formData.get("response") ?? "").trim();
  if (!suggestionId) return { error: "Sugestão inválida" };
  if (!response) return { error: "Escreva uma resposta" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("suggestions")
    .update({ response, status: "answered", responded_at: new Date().toISOString() })
    .eq("id", suggestionId);

  if (error) return { error: "Não foi possível salvar a resposta" };

  revalidatePath("/dev/sugestoes");
  return null;
}
