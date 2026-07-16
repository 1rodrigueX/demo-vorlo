import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Conversation = {
  contact: { id: string; name: string; phone: string | null };
  lastMessage: { body: string | null; direction: "outbound" | "inbound"; created_at: string };
  deal: { value: number; status: "open" | "won" | "lost"; proposalSentAt: string | null } | null;
};

const RECENT_MESSAGE_LIMIT = 500;

/**
 * Lista de conversas ordenada por mensagem mais recente primeiro.
 * Duas consultas + agrupamento em JS (sem view/RPC nova no banco) — suficiente
 * para o volume de uma conta pessoal de WhatsApp.
 */
export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("whatsapp_messages")
    .select("contact_id, body, direction, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_MESSAGE_LIMIT);

  if (!messages?.length) return [];

  const lastByContact = new Map<string, (typeof messages)[number]>();
  for (const m of messages) {
    if (!lastByContact.has(m.contact_id)) lastByContact.set(m.contact_id, m);
  }

  const contactIds = [...lastByContact.keys()];

  const [{ data: contacts }, { data: deals }] = await Promise.all([
    supabase.from("contacts").select("id, name, phone").in("id", contactIds),
    supabase
      .from("deals")
      .select("contact_id, value, status, proposal_sent_at")
      .in("contact_id", contactIds)
      .order("created_at", { ascending: false }),
  ]);

  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));

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
    conversations.push({
      contact,
      lastMessage,
      deal: deal ? { value: Number(deal.value), status: deal.status, proposalSentAt: deal.proposal_sent_at } : null,
    });
  }

  return conversations;
}
