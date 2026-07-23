"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";

export type ActionState = { error?: string } | null;

const schema = z.object({
  enabled: z.boolean(),
  followup_delay_hours: z.coerce.number().int().min(1).max(720),
  followup_message: z.string().trim().min(1, "A mensagem de follow-up é obrigatória"),
  followup_tag_name: z.string().trim().min(1, "O nome da tag é obrigatório"),
  inactive_delay_hours: z.coerce.number().int().min(1).max(720),
  inactive_tag_name: z.string().trim().min(1, "O nome da tag é obrigatório"),
  won_message_enabled: z.boolean(),
  won_message: z.string().trim().min(1, "A mensagem de venda ganha é obrigatória"),
});

export async function saveFunnelSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({
    enabled: formData.get("enabled") === "on",
    followup_delay_hours: formData.get("followup_delay_hours"),
    followup_message: formData.get("followup_message"),
    followup_tag_name: formData.get("followup_tag_name"),
    inactive_delay_hours: formData.get("inactive_delay_hours"),
    inactive_tag_name: formData.get("inactive_tag_name"),
    won_message_enabled: formData.get("won_message_enabled") === "on",
    won_message: formData.get("won_message"),
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
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("funnel_automation_settings")
    .upsert({ tenant_id: tenantId, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });

  if (error) {
    return { error: "Não foi possível salvar (só administradores podem editar as automações)" };
  }

  revalidatePath("/[tenantSlug]/settings/automacoes", "page");
  return null;
}
