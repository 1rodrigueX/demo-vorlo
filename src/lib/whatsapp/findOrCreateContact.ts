import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Looks up a contact by phone (E.164), auto-creating one if none exists —
 * used anywhere a WhatsApp message arrives (live or historical) with no
 * matching CRM contact. The user doesn't want to pre-register every client
 * before receiving from them.
 *
 * Never overwrites an existing contact's name from WhatsApp data.
 */
export async function findOrCreateContact(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  phone: string,
  name?: string | null,
): Promise<{ id: string; isNew: boolean } | null> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return { id: existing.id, isNew: false };

  const ownerId = await pickLeastLoadedMember(supabase, tenantId);
  if (!ownerId) return null;

  // needs_registration=true: sinaliza pro SDR de IA que este contato ainda
  // precisa ter os dados de cadastro coletados (ver runSdrLeadTurn).
  const { data: created } = await supabase
    .from("contacts")
    .insert({
      tenant_id: tenantId,
      name: name?.trim() || phone,
      phone,
      lead_source: "WhatsApp",
      created_by: ownerId,
      needs_registration: true,
    })
    .select("id")
    .single();

  return created ? { id: created.id, isNew: true } : null;
}

/**
 * Distribui leads novos em rodízio pelos vendedores (role = 'member') do
 * mesmo tenant, sempre escolhendo quem tem menos contatos no momento — se
 * autoequilibra sozinho, sem precisar de tabela/cursor de rodízio à parte.
 * Owners/managers não entram na distribuição automática (mas continuam
 * vendo tudo e podem assumir qualquer conversa manualmente depois).
 */
export async function pickLeastLoadedMember(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
): Promise<string | null> {
  const { data: members } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "member");

  const pool = members?.length
    ? members
    : (await supabase.from("profiles").select("id").eq("tenant_id", tenantId)).data;
  if (!pool?.length) return null;
  if (pool.length === 1) return pool[0].id;

  const { data: existingContacts } = await supabase
    .from("contacts")
    .select("created_by")
    .eq("tenant_id", tenantId);

  const loadByUser = new Map(pool.map((p) => [p.id, 0]));
  for (const c of existingContacts ?? []) {
    if (c.created_by && loadByUser.has(c.created_by)) {
      loadByUser.set(c.created_by, (loadByUser.get(c.created_by) ?? 0) + 1);
    }
  }

  let chosen = pool[0].id;
  let min = Infinity;
  for (const [id, count] of loadByUser) {
    if (count < min) {
      min = count;
      chosen = id;
    }
  }
  return chosen;
}
