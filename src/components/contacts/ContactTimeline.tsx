import { MessageCircle, Phone, StickyNote, Clock, ArrowRightLeft } from "lucide-react";
import { formatRelative } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export type TimelineEntry = {
  id: string;
  type: "note" | "call" | "whatsapp" | "follow_up" | "stage_change";
  body: string | null;
  direction: "outbound" | "inbound" | null;
  created_at: string;
  profile: { full_name: string | null } | null;
  whatsapp_message: { status: string } | null;
};

const iconByType = {
  note: StickyNote,
  call: Phone,
  whatsapp: MessageCircle,
  follow_up: Clock,
  stage_change: ArrowRightLeft,
};

const labelByType: Record<TimelineEntry["type"], string> = {
  note: "Nota",
  call: "Ligação",
  whatsapp: "WhatsApp",
  follow_up: "Follow-up",
  stage_change: "Movimentação",
};

const statusLabel: Record<string, string> = {
  queued: "na fila",
  sending: "enviando",
  sent: "enviado",
  delivered: "entregue",
  undelivered: "não entregue",
  read: "lido",
  failed: "falhou",
  received: "recebido",
};

export function ContactTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-gray-500">Nenhuma atividade registrada ainda.</p>;
  }

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        const Icon = iconByType[entry.type];
        return (
          <li key={entry.id} className="flex gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                entry.type === "whatsapp"
                  ? "bg-green-50 text-green-600"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              <Icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{labelByType[entry.type]}</span>
                {entry.direction && (
                  <span>{entry.direction === "outbound" ? "enviado" : "recebido"}</span>
                )}
                {entry.whatsapp_message?.status && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5">
                    {statusLabel[entry.whatsapp_message.status] ?? entry.whatsapp_message.status}
                  </span>
                )}
                <span>·</span>
                <span>{formatRelative(entry.created_at)}</span>
                {entry.profile?.full_name && <span>· {entry.profile.full_name}</span>}
              </div>
              {entry.body && <p className="mt-0.5 text-sm text-gray-800">{entry.body}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
