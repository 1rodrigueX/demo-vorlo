"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { createBlingConnectionSchema, updateBlingCredentialsSchema } from "@/lib/validation/bling";
import { findOrCreateTagByName } from "@/lib/tags/ensureTag";
import { encryptSecret } from "@/lib/crypto/secrets";

export type ActionState = { error?: string } | null;

export async function createBlingConnection(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createBlingConnectionSchema.safeParse({
    name: formData.get("name"),
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

  // O nome da conexão (filial) já vira a tag usada pra rotear contatos até ela.
  const tagId = await findOrCreateTagByName(supabase, tenantId, parsed.data.name);
  if (!tagId) return { error: "Não foi possível criar a tag dessa filial" };

  const { error } = await supabase.from("bling_connections").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    client_id: parsed.data.clientId,
    client_secret: encryptSecret(parsed.data.clientSecret),
    tag_id: tagId,
    is_default: false,
  });

  if (error) {
    const message = error.code === "23505" ? "Já existe uma conexão usando essa tag" : error.message;
    return { error: `Não foi possível criar a conexão: ${message}` };
  }

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
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
      client_secret: encryptSecret(parsed.data.clientSecret),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);

  if (error) {
    console.error("updateBlingCredentials failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return null;
}

export async function setBlingConnectionTag(connectionId: string, tagId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("bling_connections").update({ tag_id: tagId }).eq("id", connectionId);

  if (error) {
    const message = error.code === "23505" ? "Essa tag já está em uso por outra conexão" : error.message;
    return { error: message };
  }

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
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

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return null;
}

export async function setBlingConnectionSeller(
  connectionId: string,
  profileId: string,
  blingVendedorId: string,
  blingVendedorName: string,
) {
  const supabase = await createClient();

  if (!blingVendedorId) {
    const { error } = await supabase
      .from("bling_connection_sellers")
      .delete()
      .eq("bling_connection_id", connectionId)
      .eq("profile_id", profileId);
    return { error: error?.message };
  }

  const { error } = await supabase.from("bling_connection_sellers").upsert(
    {
      bling_connection_id: connectionId,
      profile_id: profileId,
      bling_vendedor_id: blingVendedorId,
      bling_vendedor_name: blingVendedorName,
    },
    { onConflict: "bling_connection_id,profile_id" },
  );

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return { error: error?.message };
}

export async function deleteBlingConnection(connectionId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("bling_connections").delete().eq("id", connectionId);

  if (error) {
    return { error: "Não foi possível excluir (a conexão padrão não pode ser removida)" };
  }

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return null;
}
