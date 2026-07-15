import { EmailInboxShell } from "@/components/email/EmailInboxShell";
import { getEmailConversations } from "@/lib/email/getConversations";

export default async function EmailsLayout({ children }: { children: React.ReactNode }) {
  const conversations = await getEmailConversations();

  return <EmailInboxShell conversations={conversations}>{children}</EmailInboxShell>;
}
