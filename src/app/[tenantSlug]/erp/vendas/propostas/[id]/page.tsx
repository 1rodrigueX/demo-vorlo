import { notFound } from "next/navigation";
import { DocumentLayout } from "@/components/erp/documents/DocumentLayout";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { QUOTE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { PropostaDetalheActions } from "@/components/erp/vendas/PropostaDetalheActions";
import { getErpPropostaById } from "@/lib/actions/erp-propostas";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDocument, formatShortDate } from "@/components/erp/lib/format";

const REGIME_LABEL: Record<string, string> = {
  simples: "Simples Nacional",
  presumido: "Lucro Presumido",
  real: "Lucro Real",
};

export default async function PropostaDetalhePage({ params }: { params: Promise<{ tenantSlug: string; id: string }> }) {
  const { tenantSlug, id } = await params;
  const proposta = await getErpPropostaById(id);
  if (!proposta) notFound();

  const subtotal = proposta.itens.reduce((s, i) => s + (i.unit_price_cents / 100) * i.quantity * (1 - i.discount_pct / 100), 0);
  const total = subtotal + proposta.freight_cents / 100 - proposta.discount_cents / 100;

  return (
    <div className="space-y-5">
      <div className="erp-print-hide flex flex-wrap items-start justify-between gap-3">
        <div>
          <ErpBreadcrumb
            items={[{ label: "Vendas", href: "/erp/vendas" }, { label: "Propostas comerciais", href: "/erp/vendas/propostas" }, { label: proposta.number }]}
            tenantSlug={tenantSlug}
          />
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{proposta.number}</h1>
            <StatusBadge status={proposta.status} map={QUOTE_STATUS_MAP} />
            {proposta.source === "sdr" && (
              <span className="rounded-full bg-[#ff5722]/10 px-2 py-0.5 text-[11px] font-medium text-[#ff5722]">Montada pelo SDR</span>
            )}
          </div>
        </div>
        <PropostaDetalheActions propostaId={proposta.id} status={proposta.status} hasPhone={!!proposta.contact?.phone} />
      </div>

      <DocumentLayout
        title="Proposta Comercial"
        documentNumber={proposta.number}
        issuer={{
          name: proposta.empresa?.name ?? "Sua Empresa Ltda",
          document: proposta.empresa ? formatDocument(proposta.empresa.cnpj ?? "") : "00.000.000/0001-00",
        }}
        meta={[
          { label: "Cliente", value: proposta.contact?.name ?? "—" },
          { label: "Vendedor", value: proposta.seller?.full_name ?? "—" },
          { label: "Data", value: formatShortDate(proposta.quote_date) },
          { label: "Validade", value: proposta.valid_until ? formatShortDate(proposta.valid_until) : "—" },
          { label: "Pagamento", value: proposta.payment_term ?? "—" },
          { label: "Frete", value: proposta.freight_type ?? "—" },
          ...(proposta.empresa
            ? [{ label: "Regime tributário", value: REGIME_LABEL[proposta.empresa.regime_tributario] ?? proposta.empresa.regime_tributario }]
            : []),
        ]}
        footer={
          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {proposta.discount_cents > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Desconto</span>
                <span>-{formatCurrency(proposta.discount_cents / 100)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Frete</span>
              <span>{formatCurrency(proposta.freight_cents / 100)}</span>
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
            {proposta.itens.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 text-gray-800">{item.product_name_snapshot}</td>
                <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price_cents / 100)}</td>
                <td className="py-2.5 text-right text-gray-600">{item.discount_pct > 0 ? `${item.discount_pct}%` : "—"}</td>
                <td className="py-2.5 text-right font-medium text-gray-800">
                  {formatCurrency((item.unit_price_cents / 100) * item.quantity * (1 - item.discount_pct / 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {proposta.notes && (
          <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <span className="font-medium text-gray-800">Observações: </span>
            {proposta.notes}
          </p>
        )}
      </DocumentLayout>
    </div>
  );
}
