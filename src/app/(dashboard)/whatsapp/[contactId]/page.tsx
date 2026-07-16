import Link from "next/link";
import { notFound } from "next/navigation";
import { SquarePen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppChatPanel } from "@/components/contacts/WhatsAppChatPanel";
import { DealQuickPanel } from "@/components/whatsapp/DealQuickPanel";
import { AgentChatPanel } from "@/components/assistant/AgentChatPanel";
import type { WhatsAppMessage } from "@/types/domain";

export default async function WhatsAppConversationPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const supabase = await createClient();

  const [{ data: contact }, { data: messages }, { data: deal }, { data: falaAi }] = await Promise.all([
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
    supabase.from("ai_agents").select("id").eq("is_fala_ai", true).maybeSingle(),
  ]);

  if (!contact) notFound();

  return (
    <div className="flex h-full gap-4">
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-panel">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
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
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-panel px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-400"
            >
              <SquarePen size={13} />
              Editar lead
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

      {falaAi && (
        <div className="h-full w-80 shrink-0">
          <AgentChatPanel
            agentId={falaAi.id}
            mode="inline"
            title="FALA AI"
            subtitle="Tire dúvidas sobre este lead ou sobre o CRM"
            emptyStateHint='Pergunte algo como "qual valor sugerir pra esse lead?" ou "como eu marco uma venda como ganha?".'
            contextHint={`Contexto desta conversa: o vendedor está vendo agora, no WhatsApp, a conversa com o lead "${contact.name}"${contact.phone ? ` (${contact.phone})` : ""}, contactId ${contact.id}. Se a dúvida for sobre esse lead especificamente, use as ferramentas de busca/negócio com esse contactId em vez de perguntar o nome de novo.`}
          />
        </div>
      )}
    </div>
  );
}
