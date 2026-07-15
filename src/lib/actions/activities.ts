"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { activitySchema } from "@/lib/validation/activity";

export type ActionState = { error?: string } | null;

export async function logActivity(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = activitySchema.safeParse({
    contactId: formData.get("contactId"),
    type: formData.get("type"),
    body: formData.get("body"),
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

  const { error } = await supabase.from("activities").insert({
    tenant_id: tenantId,
    contact_id: parsed.data.contactId,
    type: parsed.data.type,
    body: parsed.data.body,
    created_by: user.id,
  });

  if (error) {
    return { error: "Não foi possível salvar a atividade" };
  }

  revalidatePath(`/contacts/${parsed.data.contactId}`);
  return null;
}
