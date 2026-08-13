"use client";

import { useParams, notFound } from "next/navigation";
import { DocumentLayout } from "@/components/erp/documents/DocumentLayout";
import { PrintButton } from "@/components/erp/documents/PrintButton";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { getMockProductionOrderById } from "@/mocks/erp/productionOrders";
import { formatShortDate } from "@/components/erp/lib/format";

export default function RelatorioDeProducaoPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const op = getMockProductionOrderById(id);
  if (!op) notFound();

  const totalUnits = op.quantityProduced + op.quantityRejected;
  const wastePct = totalUnits > 0 ? Math.round((op.quantityRejected / totalUnits) * 1000) / 10 : 0;

  return (
    <div className="space-y-5">
      <div className="erp-print-hide flex flex-wrap items-start justify-between gap-3">
        <div>
          <ErpBreadcrumb
            items={[{ label: "Produção", href: "/erp/producao" }, { label: op.number, href: `/erp/producao/ordens/${op.id}` }, { label: "Relatório" }]}
            tenantSlug={tenantSlug}
          />
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Relatório de produção — {op.number}</h1>
        </div>
        <PrintButton label="Imprimir relatório" />
      </div>

      <DocumentLayout
        title="Relatório de Produção"
        documentNumber={op.number}
        issuer={{ name: "Sua Empresa Ltda", document: "00.000.000/0001-00" }}
        meta={[
          { label: "OP", value: op.number },
          { label: "Pedido", value: op.orderNumber },
          { label: "Cliente", value: op.customerName },
          { label: "Produto", value: op.productName },
          { label: "Operador", value: op.operator },
          { label: "Máquina", value: op.machine },
          { label: "Início", value: formatShortDate(op.startDate) },
          { label: "Fim", value: op.endDate ? formatShortDate(op.endDate) : "Em andamento" },
        ]}
      >
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2.5 text-gray-500">Quantidade solicitada</td>
              <td className="py-2.5 text-right font-medium text-gray-900">{op.quantityPlanned.toLocaleString("pt-BR")} un.</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2.5 text-gray-500">Quantidade produzida</td>
              <td className="py-2.5 text-right font-medium text-gray-900">{op.quantityProduced.toLocaleString("pt-BR")} un.</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2.5 text-gray-500">Quantidade rejeitada</td>
              <td className="py-2.5 text-right font-medium text-red-600">{op.quantityRejected.toLocaleString("pt-BR")} un.</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2.5 text-gray-500">Matéria-prima prevista</td>
              <td className="py-2.5 text-right font-medium text-gray-900">{op.rawMaterialPlanned}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2.5 text-gray-500">Matéria-prima utilizada</td>
              <td className="py-2.5 text-right font-medium text-gray-900">{op.rawMaterialUsed}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-gray-500">Perda (rejeição sobre total produzido)</td>
              <td className="py-2.5 text-right font-medium text-amber-600">{wastePct}%</td>
            </tr>
          </tbody>
        </table>

        {op.notes && (
          <div className="mt-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Observações</p>
            <p className="mt-1 text-sm text-gray-700">{op.notes}</p>
          </div>
        )}
      </DocumentLayout>
    </div>
  );
}
