"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/Badge";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import type { Conversation } from "@/lib/whatsapp/getConversations";

function DealBadge({ deal }: { deal: Conversation["deal"] }) {
  if (!deal) return null;

  if (deal.status === "won") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700">
        <Trophy size={11} className="mr-1" />
        Ganho
      </Badge>
    );
  }

  if (deal.proposalSentAt) {
    return (
      <Badge className="bg-sky-50 text-sky-700">
        <FileCheck2 size={11} className="mr-1" />
        Proposta enviada
      </Badge>
    );
  }

  if (deal.value > 0) {
    return <Badge className="bg-gray-100 text-gray-600">{formatCurrency(deal.value)}</Badge>;
  }

  return null;
}

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  const pathname = usePathname();
  const tenantSlug = useTenantSlug();

  if (!conversations.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
        Nenhuma conversa ainda.
      </div>
    );
  }

  return (
    <ul className="h-full divide-y divide-gray-100 overflow-y-auto">
      {conversations.map(({ contact, lastMessage, deal }) => {
        const href = `/${tenantSlug}/whatsapp/${contact.id}`;
        const isActive = pathname === href;
        const initials = contact.name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <li key={contact.id}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-gray-50",
                isActive && "bg-emerald-50",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                {initials || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatRelative(lastMessage.created_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-gray-500">
                  {lastMessage.direction === "outbound" && "Você: "}
                  {lastMessage.body}
                </p>
                <div className="mt-1">
                  <DealBadge deal={deal} />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
