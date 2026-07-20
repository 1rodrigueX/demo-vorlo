import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";

export type ClosedDeal = {
  dealId: string;
  contactId: string;
  contactName: string;
  title: string;
  value: number;
  closedAt: string;
  /** Quantos negócios ganhos desse contato foram somados nessa linha (ver getDashboardData). */
  dealCount: number;
};

export function ClosedDealsCard({ deals, tenantSlug }: { deals: ClosedDeal[]; tenantSlug: string }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={16} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Negócios fechados</h2>
      </div>

      {!deals.length ? (
        <p className="text-sm text-gray-500">Nenhuma venda ganha ainda.</p>
      ) : (
        <ul className="space-y-1">
          {deals.map((d) => (
            <li key={d.dealId}>
              <Link
                href={`/${tenantSlug}/contacts/${d.contactId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {d.title}
                    {d.dealCount > 1 && (
                      <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                        +{d.dealCount - 1} negócio{d.dealCount - 1 > 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.contactName} · Fechado em {formatDateTime(d.closedAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-600">
                  {formatCurrency(d.value)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
