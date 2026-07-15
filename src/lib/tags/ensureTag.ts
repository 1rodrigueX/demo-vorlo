import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

/** Acha uma tag pelo nome (case-insensitive) ou cria se não existir. */
export async function findOrCreateTagByName(
  supabase: Supabase,
  tenantId: string,
  name: string,
  color = "#6366f1",
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: created, error } = await supabase
    .from("tags")
    .insert({ tenant_id: tenantId, name: trimmed, color })
    .select("id")
    .single();

  if (created) return created.id;

  // Já existe uma tag com esse nome (unique index tenant_id + lower(name)) — busca o id dela.
  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", trimmed)
      .maybeSingle();
    return existing?.id ?? null;
  }

  return null;
}

/** Tag "de vendedor" ligada 1:1 a um membro da equipe — criada sob demanda na primeira vez que o SDR precisar dela. */
export async function ensureSellerTag(
  supabase: Supabase,
  tenantId: string,
  profileId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("seller_tag_id, full_name")
    .eq("id", profileId)
    .maybeSingle();

  if (profile?.seller_tag_id) return profile.seller_tag_id;

  const name = profile?.full_name?.trim() || "Vendedor";
  const tagId = await findOrCreateTagByName(supabase, tenantId, name, "#0ea5e9");
  if (!tagId) return null;

  await supabase.from("profiles").update({ seller_tag_id: tagId }).eq("id", profileId);
  return tagId;
}
