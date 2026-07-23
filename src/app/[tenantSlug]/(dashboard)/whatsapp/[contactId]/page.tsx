import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentChatPanel } from "@/components/assistant/AgentChatPanel";
import { ConversationWithAssistant } from "@/components/whatsapp/ConversationWithAssistant";
import { LeadConversationPanel } from "@/components/whatsapp/LeadConversationPanel";
import { CHANNEL_ORDER, type ChannelKey } from "@/components/whatsapp/channelMeta";
import type { WhatsAppMessage } from "@/types/domain";

export default async function WhatsAppConversationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; contactId: string }>;
}) {
  const { tenantSlug, contactId } = await params;
  const supabase = await createClient();

  const [{ data: contact }, { data: messages }, { data: deal }, { data: falaAi }, { data: channelRows }] =
    await Promise.all([
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
      supabase.from("lead_channels").select("channel").eq("contact_id", contactId),
    ]);

  if (!contact) notFound();

  // Canais do lead na ordem canônica (só os que ele realmente tem).
  const leadChannelSet = new Set((channelRows ?? []).map((c) => c.channel));
  const channels = CHANNEL_ORDER.filter((c) => leadChannelSet.has(c)) as ChannelKey[];

  const assistant = falaAi ? (
    <AgentChatPanel
      agentId={falaAi.id}
      mode="inline"
      title="Synexa"
      subtitle="Tire dúvidas sobre este lead ou sobre o CRM"
      emptyStateHint='Pergunte algo como "qual valor sugerir pra esse lead?" ou "como eu marco uma venda como ganha?".'
      contextHint={`Contexto desta conversa: o vendedor está vendo agora, no WhatsApp, a conversa com o lead "${contact.name}"${contact.phone ? ` (${contact.phone})` : ""}, contactId ${contact.id}. Se a dúvida for sobre esse lead especificamente, use as ferramentas de busca/negócio com esse contactId em vez de perguntar o nome de novo.`}
    />
  ) : null;

  return (
    <ConversationWithAssistant assistant={assistant}>
      <LeadConversationPanel
        tenantSlug={tenantSlug}
        contact={contact}
        channels={channels}
        initialMessages={(messages ?? []) as WhatsAppMessage[]}
        deal={
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
    </ConversationWithAssistant>
  );
}
