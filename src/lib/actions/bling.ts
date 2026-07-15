"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { createBlingConnectionSchema, updateBlingCredentialsSchema } from "@/lib/validation/bling";

export type ActionState = { error?: string } | null;

export async function createBlingConnection(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createBlingConnectionSchema.safeParse({
    name: formData.get("name"),
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
    tagId: formData.get("tagId") || undefined,
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

  const { error } = await supabase.from("bling_connections").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    client_id: parsed.data.clientId,
    client_secret: parsed.data.clientSecret,
    tag_id: parsed.data.tagId || null,
    is_default: false,
  });

  if (error) {
    const message = error.code === "23505" ? "Já existe uma conexão usando essa tag" : error.message;
    return { error: `Não foi possível criar a conexão: ${message}` };
  }

  revalidatePath("/settings");
  return null;
}

export async function updateBlingCredentials(
  connectionId: string,
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

  const { error } = await supabase
    .from("bling_connections")
    .update({
      client_id: parsed.data.clientId,
      client_secret: parsed.data.clientSecret,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);

  if (error) {
    console.error("updateBlingCredentials failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/settings");
  return null;
}

export async function setBlingConnectionTag(connectionId: string, tagId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("bling_connections").update({ tag_id: tagId }).eq("id", connectionId);

  if (error) {
    const message = error.code === "23505" ? "Essa tag já está em uso por outra conexão" : error.message;
    return { error: message };
  }

  revalidatePath("/settings");
  return { error: undefined };
}

export async function disconnectBlingConnection(connectionId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const { error } = await supabase
    .from("bling_connections")
    .update({
      access_token: null,
      refresh_token: null,
      expires_at: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);

  if (error) return { error: "Não foi possível desconectar" };

  revalidatePath("/settings");
  return null;
}

export async function deleteBlingConnection(connectionId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("bling_connections").delete().eq("id", connectionId);

  if (error) {
    return { error: "Não foi possível excluir (a conexão padrão não pode ser removida)" };
  }

  revalidatePath("/settings");
  return null;
}
