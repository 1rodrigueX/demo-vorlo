"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { FileText, ClipboardList, User, Calendar, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ORDER_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockSaleById } from "@/mocks/erp/sales";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function VendaDetalhePage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const sale = getMockSaleById(id);
  if (!sale) notFound();

  return (
    <div className="space-y-5">
      <div>
        <ErpBreadcrumb items={[{ label: "Vendas", href: "/erp/vendas" }, { label: sale.number }]} tenantSlug={tenantSlug} />
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{sale.number}</h1>
          <StatusBadge status={sale.status} map={ORDER_STATUS_MAP} />
        </div>
      </div>

      <Card className="p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <InfoRow icon={User} label="Cliente" value={sale.customerName} />
          <InfoRow icon={User} label="Vendedor" value={sale.sellerName} />
          <InfoRow icon={Calendar} label="Data da venda" value={formatShortDate(sale.date)} />
          <InfoRow icon={CreditCard} label="Condição de pagamento" value={sale.paymentTerm} />
        </div>
        <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-500">Valor total</span>
          <span className="text-lg font-semibold text-gray-900">{formatCurrency(sale.value)}</span>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-3 p-5">
        {sale.quoteNumber && (
          <Link
            href={`/${tenantSlug}/erp/vendas/propostas`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileText size={15} />
            Originada da proposta {sale.quoteNumber}
          </Link>
        )}
        <Link
          href={`/${tenantSlug}/erp/vendas/pedidos`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ClipboardList size={15} />
          Ver pedidos de venda relacionados
        </Link>
      </Card>
    </div>
  );
}
