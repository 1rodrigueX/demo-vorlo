"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { updateBlingCredentialsSchema } from "@/lib/validation/bling";

export type ActionState = { error?: string } | null;

export async function updateBlingCredentials(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateBlingCredentialsSchema.safeParse({
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
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

  const { error } = await supabase.from("bling_connections").upsert({
    tenant_id: tenantId,
    client_id: parsed.data.clientId,
    client_secret: parsed.data.clientSecret,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("updateBlingCredentials failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/settings");
  return null;
}

export async function disconnectBling(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("bling_connections")
    .update({
      access_token: null,
      refresh_token: null,
      expires_at: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);

  if (error) return { error: "Não foi possível desconectar" };

  revalidatePath("/settings");
  return null;
}
