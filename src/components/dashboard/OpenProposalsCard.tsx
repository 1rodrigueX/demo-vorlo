import Link from "next/link";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatRelative } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export type OpenProposal = {
  dealId: string;
  contactId: string;
  contactName: string;
  value: number;
  proposalSentAt: string;
  daysSince: number;
};

export function OpenProposalsCard({ proposals, tenantSlug }: { proposals: OpenProposal[]; tenantSlug: string }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Clock size={16} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Propostas em aberto</h2>
      </div>

      {!proposals.length ? (
        <p className="text-sm text-gray-500">Nenhuma proposta enviada aguardando resposta.</p>
      ) : (
        <ul className="space-y-1">
          {proposals.map((p) => {
            const isLate = p.daysSince >= 3;
            return (
              <li key={p.dealId}>
                <Link
                  href={`/${tenantSlug}/whatsapp/${p.contactId}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-gray-50",
                    isLate ? "border-amber-200 bg-amber-50/50" : "border-gray-100",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{p.contactName}</p>
                    <p className={cn("text-xs", isLate ? "font-medium text-amber-700" : "text-gray-500")}>
                      Enviada {formatRelative(p.proposalSentAt)}
                      {isLate && " · sem resposta"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-700">
                    {formatCurrency(p.value)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
