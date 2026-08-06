import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLeastLoadedMember } from "@/lib/whatsapp/findOrCreateContact";
import { normalizeEmail } from "@/lib/crm/phone";

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
  // Casa por email_key (normalizado, ver 0070_contact_dedupe) e pega o mais
  // antigo em vez de exigir linha única: e-mail NÃO é chave única no CRM
  // (contato@empresa.com pode estar em várias pessoas). Antes, dois contatos
  // com o mesmo e-mail faziam a busca falhar e um terceiro era criado.
  const emailKey = normalizeEmail(email);
  if (!emailKey) return null;

  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email_key", emailKey)
    .order("created_at", { ascending: true })
    .limit(1)
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
