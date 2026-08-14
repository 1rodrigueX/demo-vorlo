import "server-only";
import { currentTenantContext } from "@/lib/auth/current-user";

export type Conversation = {
  contact: { id: string; name: string; phone: string | null };
  /** Vendedor responsável (dono do contato) — usado no filtro da lista. */
  owner: { id: string; name: string } | null;
  lastMessage: { body: string | null; direction: "outbound" | "inbound"; created_at: string };
  deal: { value: number; status: "open" | "won" | "lost"; proposalSentAt: string | null } | null;
};

const RECENT_MESSAGE_LIMIT = 500;

/**
 * Lista de conversas ordenada por mensagem mais recente primeiro.
 * Duas consultas + agrupamento em JS (sem view/RPC nova no banco) — suficiente
 * para o volume de uma conta pessoal de WhatsApp.
 *
 * Faltava filtro de tenant aqui — ficou de fora da varredura de
 * fix(security) c896226 (aquela pegou o detalhe da conversa, [contactId]/
 * page.tsx, mas não a lista). Sem isso, todo tenant via as conversas de
 * TODOS os tenants da plataforma misturadas na aba Leads.
 */
export async function getConversations(): Promise<Conversation[]> {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return [];

  // whatsapp_messages é filtrado por contact_id de um contato deste tenant
  // (não só por tenant_id direto) — mesma abordagem defensiva de
  // getConversationMetrics.ts, cobre eventuais linhas antigas sem
  // tenant_id preenchido.
  const { data: tenantContacts } = await supabase.from("contacts").select("id").eq("tenant_id", tenantId);
  const tenantContactIds = (tenantContacts ?? []).map((c) => c.id);
  if (tenantContactIds.length === 0) return [];

  const { data: messages } = await supabase
    .from("whatsapp_messages")
    .select("contact_id, body, direction, created_at")
    .in("contact_id", tenantContactIds)
    .order("created_at", { ascending: false })
    .limit(RECENT_MESSAGE_LIMIT);

  if (!messages?.length) return [];

  const lastByContact = new Map<string, (typeof messages)[number]>();
  for (const m of messages) {
    if (!lastByContact.has(m.contact_id)) lastByContact.set(m.contact_id, m);
  }

  const contactIds = [...lastByContact.keys()];

  const [{ data: contacts }, { data: deals }, { data: sellers }] = await Promise.all([
    supabase.from("contacts").select("id, name, phone, created_by").in("id", contactIds).eq("tenant_id", tenantId),
    supabase
      .from("deals")
      .select("contact_id, value, status, proposal_sent_at")
      .in("contact_id", contactIds)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("tenant_id", tenantId),
  ]);

  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));
  const sellerName = new Map((sellers ?? []).map((s) => [s.id, s.full_name]));

  // A mais recente primeiro (já ordenado na query) — só guarda a primeira por contato.
  const dealByContact = new Map<string, NonNullable<typeof deals>[number]>();
  for (const d of deals ?? []) {
    if (!dealByContact.has(d.contact_id)) dealByContact.set(d.contact_id, d);
  }

  const conversations: Conversation[] = [];
  for (const contactId of contactIds) {
    const contact = contactById.get(contactId);
    const lastMessage = lastByContact.get(contactId);
    if (!contact || !lastMessage) continue;
    const deal = dealByContact.get(contactId);
    const ownerId = contact.created_by;
    conversations.push({
      contact: { id: contact.id, name: contact.name, phone: contact.phone },
      owner: ownerId ? { id: ownerId, name: sellerName.get(ownerId) || "Sem responsável" } : null,
      lastMessage,
      deal: deal ? { value: Number(deal.value), status: deal.status, proposalSentAt: deal.proposal_sent_at } : null,
    });
  }

  return conversations;
}
