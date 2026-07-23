import { Card } from "@/components/ui/Card";

export function MessagesReceivedCard({
  total,
  channels,
  periodLabel,
}: {
  total: number;
  channels: { label: string; value: number; color: string }[];
  periodLabel: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Mensagens recebidas</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-cyan-500">
        {total.toLocaleString("pt-BR")}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{periodLabel}</p>

      <ul className="mt-4 space-y-2 border-t border-gray-200/70 pt-3">
        {channels.map((c) => (
          <li key={c.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
            <span className="font-medium tabular-nums text-gray-900">{c.value.toLocaleString("pt-BR")}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
