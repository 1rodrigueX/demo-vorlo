"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Trophy, FileCheck2, MessageCircle, UserRound } from "lucide-react";
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
  const [ownerFilter, setOwnerFilter] = useState<string>("");

  // Responsáveis distintos presentes nas conversas — alimentam o filtro.
  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of conversations) {
      if (c.owner) map.set(c.owner.id, c.owner.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations]);

  const filtered = useMemo(
    () => (ownerFilter ? conversations.filter((c) => c.owner?.id === ownerFilter) : conversations),
    [conversations, ownerFilter],
  );

  if (!conversations.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
        Nenhuma conversa ainda.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filtro por responsável — organização entre vendedores */}
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          <UserRound size={11} />
          Responsável
        </label>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-panel px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os responsáveis</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-500">
          Nenhuma conversa desse responsável.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto">
          {filtered.map(({ contact, lastMessage, deal }) => {
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
                    "flex items-center gap-3 border-l-2 px-4 py-3 transition-colors hover:bg-gray-50",
                    isActive ? "border-indigo-500 bg-indigo-500/10" : "border-transparent",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-medium text-indigo-600">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
                      <span className="shrink-0 text-xs text-gray-400">{formatRelative(lastMessage.created_at)}</span>
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {lastMessage.direction === "outbound" && "Você: "}
                      {lastMessage.body}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: "rgba(37,211,102,0.14)", color: "#0f9d58" }}
                      >
                        <MessageCircle size={9} strokeWidth={2.5} /> WhatsApp
                      </span>
                      <DealBadge deal={deal} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
