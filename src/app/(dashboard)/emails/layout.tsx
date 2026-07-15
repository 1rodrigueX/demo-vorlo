import { createClient } from "@/lib/supabase/server";
import { EmailInboxShell } from "@/components/email/EmailInboxShell";
import { getEmailConversations } from "@/lib/email/getConversations";

export default async function EmailsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [conversations, { data: contacts }] = await Promise.all([
    getEmailConversations(),
    supabase.from("contacts").select("id, name, email").order("name"),
  ]);

  return (
    <EmailInboxShell conversations={conversations} contacts={contacts ?? []}>
      {children}
    </EmailInboxShell>
  );
}
