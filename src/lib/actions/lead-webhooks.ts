"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { createLeadWebhookSchema } from "@/lib/validation/lead-webhook";

export type ActionState = { error?: string } | null;

export async function createLeadWebhook(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createLeadWebhookSchema.safeParse({
    name: formData.get("name"),
    targetStageId: formData.get("targetStageId"),
    welcomeMessage: formData.get("welcomeMessage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado para este usuário" };

  const { error } = await supabase.from("lead_webhooks").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    target_stage_id: parsed.data.targetStageId || null,
    welcome_message: parsed.data.welcomeMessage || null,
    created_by: user.id,
  });

  if (error) {
    return { error: `Não foi possível criar o webhook: ${error.message}` };
  }

  const slug = await getTenantSlug(supabase, tenantId);
  revalidatePath(`/${slug}/settings/webhooks`);
  return null;
}

export async function toggleLeadWebhook(webhookId: string, isActive: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada" };

  const { error } = await supabase.from("lead_webhooks").update({ is_active: isActive }).eq("id", webhookId);
  if (error) return { error: "Não foi possível atualizar" };

  const tenantId = await requireTenantId(supabase, user.id);
  const slug = tenantId ? await getTenantSlug(supabase, tenantId) : null;
  if (slug) revalidatePath(`/${slug}/settings/webhooks`);
  return { error: undefined };
}

export async function deleteLeadWebhook(webhookId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tenantId = await requireTenantId(supabase, user.id);
  await supabase.from("lead_webhooks").delete().eq("id", webhookId);

  const slug = tenantId ? await getTenantSlug(supabase, tenantId) : null;
  if (slug) revalidatePath(`/${slug}/settings/webhooks`);
}
