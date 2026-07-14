import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Conversation = {
  contact: { id: string; name: string; phone: string | null };
  lastMessage: { body: string | null; direction: "outbound" | "inbound"; created_at: string };
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

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, phone")
    .in("id", contactIds);

  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));

  const conversations: Conversation[] = [];
  for (const contactId of contactIds) {
    const contact = contactById.get(contactId);
    const lastMessage = lastByContact.get(contactId);
    if (!contact || !lastMessage) continue;
    conversations.push({ contact, lastMessage });
  }

  return conversations;
}
