import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Decide qual conexão Bling (filial) usar pra um contato: procura entre as
 * tags do contato uma que tenha uma conexão vinculada; sem match, cai pra
 * conexão marcada como padrão do tenant.
 */
export async function resolveBlingConnectionId(tenantId: string, contactId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: contactTags } = await admin.from("contact_tags").select("tag_id").eq("contact_id", contactId);
  const tagIds = (contactTags ?? []).map((t) => t.tag_id);

  if (tagIds.length) {
    const { data: taggedConnection } = await admin
      .from("bling_connections")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("tag_id", tagIds)
      .not("access_token", "is", null)
      .maybeSingle();
    if (taggedConnection) return taggedConnection.id;
  }

  const { data: defaultConnection } = await admin
    .from("bling_connections")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .maybeSingle();

  return defaultConnection?.id ?? null;
}
