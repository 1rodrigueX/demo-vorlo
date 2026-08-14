"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { createTagSchema } from "@/lib/validation/tags";

export type ActionState = { error?: string } | null;

export async function createTag(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createTagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
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

  const { error } = await supabase.from("tags").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    color: parsed.data.color,
  });

  if (error) {
    const message = error.code === "23505" ? "Já existe uma tag com esse nome" : error.message;
    return { error: `Não foi possível criar a tag: ${message}` };
  }

  revalidatePath("/[tenantSlug]/settings/empresa", "page");
  return null;
}

export async function deleteTag(tagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  await supabase.from("tags").delete().eq("id", tagId).eq("tenant_id", tenantId);
  revalidatePath("/[tenantSlug]/settings/empresa", "page");
  return { error: undefined };
}

export async function setContactTags(contactId: string, tagIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  // Substitui: apaga as tags atuais do contato e insere de novo as escolhidas.
  await supabase.from("contact_tags").delete().eq("contact_id", contactId).eq("tenant_id", tenantId);

  if (tagIds.length) {
    // Só aceita tags que realmente pertencem a este tenant — senão dava pra
    // linkar um tag_id de outro tenant no contact_tags deste.
    const { data: ownTags } = await supabase.from("tags").select("id").eq("tenant_id", tenantId).in("id", tagIds);
    const validTagIds = (ownTags ?? []).map((t) => t.id);

    if (validTagIds.length) {
      const { error } = await supabase
        .from("contact_tags")
        .insert(validTagIds.map((tagId) => ({ contact_id: contactId, tag_id: tagId, tenant_id: tenantId })));
      if (error) return { error: "Não foi possível salvar as tags" };
    }
  }

  revalidatePath(`/[tenantSlug]/contacts/${contactId}`, "page");
  return { error: undefined };
}
