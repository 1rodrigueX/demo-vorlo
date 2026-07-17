import { WhatsAppInboxShell } from "@/components/whatsapp/WhatsAppInboxShell";
import { getConversations } from "@/lib/whatsapp/getConversations";

export default async function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  const conversations = await getConversations();

  return <WhatsAppInboxShell conversations={conversations}>{children}</WhatsAppInboxShell>;
}
