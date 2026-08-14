import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { EmailChatPanel } from "@/components/contacts/EmailChatPanel";
import type { EmailMessage } from "@/types/domain";

export default async function EmailConversationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; contactId: string }>;
}) {
  const { tenantSlug, contactId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user ? await requireTenantId(supabase, user.id) : null;
  if (!tenantId) redirect("/login");

  const [{ data: contact }, { data: messages }] = await Promise.all([
    supabase.from("contacts").select("id, name, email").eq("id", contactId).eq("tenant_id", tenantId).maybeSingle(),
    supabase
      .from("email_messages")
      .select("*")
      .eq("contact_id", contactId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
  ]);

  if (!contact) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-panel px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
          {contact.email && <p className="text-xs text-gray-500">{contact.email}</p>}
        </div>
        <Link
          href={`/${tenantSlug}/contacts/${contact.id}`}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
        >
          Ver contato <ExternalLink size={12} />
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <EmailChatPanel
          contactId={contact.id}
          initialMessages={(messages ?? []) as EmailMessage[]}
          hasEmail={!!contact.email}
          showHeader={false}
          fillHeight
        />
      </div>
    </div>
  );
}
