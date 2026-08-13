"use client";

import { useParams, notFound } from "next/navigation";
import { DocumentLayout } from "@/components/erp/documents/DocumentLayout";
import { PrintButton } from "@/components/erp/documents/PrintButton";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { QUOTE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockQuoteById, getQuoteSubtotal, getQuoteTotal } from "@/mocks/erp/quotes";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";

export default function PropostaDetalhePage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const quote = getMockQuoteById(id);
  if (!quote) notFound();

  const subtotal = getQuoteSubtotal(quote);
  const total = getQuoteTotal(quote);

  return (
    <div className="space-y-5">
      <div className="erp-print-hide flex flex-wrap items-start justify-between gap-3">
        <div>
          <ErpBreadcrumb
            items={[{ label: "Vendas", href: "/erp/vendas" }, { label: "Propostas comerciais", href: "/erp/vendas/propostas" }, { label: quote.number }]}
            tenantSlug={tenantSlug}
          />
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{quote.number}</h1>
            <StatusBadge status={quote.status} map={QUOTE_STATUS_MAP} />
          </div>
        </div>
        <PrintButton label="Gerar PDF" />
      </div>

      <DocumentLayout
        title="Proposta Comercial"
        documentNumber={quote.number}
        issuer={{ name: "Sua Empresa Ltda", document: "00.000.000/0001-00" }}
        meta={[
          { label: "Cliente", value: quote.customerName },
          { label: "Vendedor", value: quote.sellerName },
          { label: "Data", value: formatShortDate(quote.date) },
          { label: "Validade", value: formatShortDate(quote.validUntil) },
          { label: "Pagamento", value: quote.paymentTerm },
          { label: "Frete", value: `${quote.freightType}${quote.carrier !== "—" ? ` — ${quote.carrier}` : ""}` },
        ]}
        footer={
          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Desconto</span>
                <span>-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Frete</span>
              <span>{formatCurrency(quote.freight)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="py-2">Produto</th>
              <th className="py-2 text-right">Qtd.</th>
              <th className="py-2 text-right">Preço unit.</th>
              <th className="py-2 text-right">Desc.</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 text-gray-800">{item.productName}</td>
                <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2.5 text-right text-gray-600">{item.discountPct > 0 ? `${item.discountPct}%` : "—"}</td>
                <td className="py-2.5 text-right font-medium text-gray-800">
                  {formatCurrency(item.quantity * item.unitPrice * (1 - item.discountPct / 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quote.notes && (
          <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <span className="font-medium text-gray-800">Observações: </span>
            {quote.notes}
          </p>
        )}
      </DocumentLayout>
    </div>
  );
}
