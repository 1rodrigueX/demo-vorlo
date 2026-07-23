"use client";

import Link from "next/link";
import { useState } from "react";
import { SquarePen } from "lucide-react";
import { WhatsAppChatPanel } from "@/components/contacts/WhatsAppChatPanel";
import { DealQuickPanel } from "@/components/whatsapp/DealQuickPanel";
import { LeadChannels } from "@/components/whatsapp/LeadChannels";
import { ChannelEmptyState } from "@/components/whatsapp/ChannelEmptyState";
import type { ChannelKey } from "@/components/whatsapp/channelMeta";
import type { WhatsAppMessage } from "@/types/domain";

type DealInfo = { id: string; value: number; status: "open" | "won" | "lost"; proposalSentAt: string | null } | null;

/**
 * Painel da conversa do lead com cabeçalho omnichannel. Mantém tudo do CRM no
 * lugar — só o header do lead muda (spec 2c): nome + badges de canal. O canal
 * ativo é estado de client, então trocar de canal é instantâneo (sem reload):
 * WhatsApp mostra a timeline real; os outros canais mostram o estado "ainda não
 * conectado" até a fase de integrações.
 */
export function LeadConversationPanel({
  tenantSlug,
  contact,
  channels,
  initialMessages,
  deal,
}: {
  tenantSlug: string;
  contact: { id: string; name: string; phone: string | null };
  channels: ChannelKey[];
  initialMessages: WhatsAppMessage[];
  deal: DealInfo;
}) {
  const defaultChannel: ChannelKey = channels.includes("whatsapp") ? "whatsapp" : channels[0] ?? "whatsapp";
  const [active, setActive] = useState<ChannelKey>(defaultChannel);

  const channelMessages = initialMessages.filter((m) => (m.channel ?? "whatsapp") === active);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
          {channels.length > 0 ? (
            <LeadChannels channels={channels} active={active} onSelect={setActive} />
          ) : (
            contact.phone && <p className="text-xs text-gray-500">{contact.phone}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DealQuickPanel contactId={contact.id} initialDeal={deal} />
          <Link
            href={`/${tenantSlug}/contacts/${contact.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-panel px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            <SquarePen size={13} />
            Editar lead
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {active === "whatsapp" ? (
          <WhatsAppChatPanel
            contactId={contact.id}
            initialMessages={channelMessages}
            hasPhone={!!contact.phone}
            showHeader={false}
            fillHeight
          />
        ) : (
          <ChannelEmptyState channel={active} />
        )}
      </div>
    </div>
  );
}
