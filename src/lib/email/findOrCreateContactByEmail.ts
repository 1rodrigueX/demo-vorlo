import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLeastLoadedMember } from "@/lib/whatsapp/findOrCreateContact";

/** Extrai endereço e nome de um cabeçalho "From"/"To" tipo `"Fulano" <fulano@ex.com>` ou só `fulano@ex.com`. */
export function parseEmailAddress(raw: string): { email: string; name: string | null } {
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return { email: match[2].trim().toLowerCase(), name: name || null };
  }
  return { email: raw.trim().toLowerCase(), name: null };
}

/**
 * Igual ao findOrCreateContact do WhatsApp, mas casando por e-mail — usado
 * pela sincronização do canal de E-mails (Gmail/Outlook).
 */
export async function findOrCreateContactByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  email: string,
  name?: string | null,
): Promise<{ id: string } | null> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .maybeSingle();

  if (existing) return existing;

  const ownerId = await pickLeastLoadedMember(supabase, tenantId);
  if (!ownerId) return null;

  const { data: created } = await supabase
    .from("contacts")
    .insert({
      tenant_id: tenantId,
      name: name?.trim() || email,
      email,
      lead_source: "E-mail",
      created_by: ownerId,
    })
    .select("id")
    .single();

  return created;
}
