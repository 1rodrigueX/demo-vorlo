import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EmailConversation = {
  contact: { id: string; name: string; email: string | null };
  lastMessage: {
    subject: string | null;
    body: string | null;
    direction: "outbound" | "inbound";
    created_at: string;
  };
};

const RECENT_MESSAGE_LIMIT = 500;

/** Mesma estratégia de getConversations() do WhatsApp: 2 consultas + agrupamento em JS. */
export async function getEmailConversations(): Promise<EmailConversation[]> {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("email_messages")
    .select("contact_id, subject, body, direction, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_MESSAGE_LIMIT);

  if (!messages?.length) return [];

  const lastByContact = new Map<string, (typeof messages)[number]>();
  for (const m of messages) {
    if (!lastByContact.has(m.contact_id)) lastByContact.set(m.contact_id, m);
  }

  const contactIds = [...lastByContact.keys()];

  const { data: contacts } = await supabase.from("contacts").select("id, name, email").in("id", contactIds);
  const contactById = new Map((contacts ?? []).map((c) => [c.id, c]));

  const conversations: EmailConversation[] = [];
  for (const contactId of contactIds) {
    const contact = contactById.get(contactId);
    const lastMessage = lastByContact.get(contactId);
    if (!contact || !lastMessage) continue;
    conversations.push({ contact, lastMessage });
  }

  return conversations;
}
