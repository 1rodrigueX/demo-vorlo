import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppChatPanel } from "@/components/contacts/WhatsAppChatPanel";
import { DealQuickPanel } from "@/components/whatsapp/DealQuickPanel";
import type { WhatsAppMessage } from "@/types/domain";

export default async function WhatsAppConversationPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const supabase = await createClient();

  const [{ data: contact }, { data: messages }, { data: deal }] = await Promise.all([
    supabase.from("contacts").select("id, name, phone").eq("id", contactId).single(),
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true }),
    supabase
      .from("deals")
      .select("id, value, status, proposal_sent_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!contact) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
          {contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <DealQuickPanel
            contactId={contact.id}
            initialDeal={
              deal
                ? {
                    id: deal.id,
                    value: Number(deal.value),
                    status: deal.status,
                    proposalSentAt: deal.proposal_sent_at,
                  }
                : null
            }
          />
          <Link
            href={`/contacts/${contact.id}`}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            Ver contato <ExternalLink size={12} />
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <WhatsAppChatPanel
          contactId={contact.id}
          initialMessages={(messages ?? []) as WhatsAppMessage[]}
          hasPhone={!!contact.phone}
          showHeader={false}
          fillHeight
        />
      </div>
    </div>
  );
}
