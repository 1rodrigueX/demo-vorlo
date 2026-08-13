"use client";

import { useState } from "react";
import { Barcode } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { FINANCE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DocumentLayout } from "@/components/erp/documents/DocumentLayout";
import { PrintButton } from "@/components/erp/documents/PrintButton";
import { getMockBoletos, type Boleto } from "@/mocks/erp/boletos";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Boleto>[] = [
  { key: "number", header: "Número", sortable: true, sortAccessor: (r) => r.number, render: (r) => <span className="font-medium text-gray-900">{r.number}</span> },
  { key: "customerName", header: "Cliente" },
  { key: "dueDate", header: "Vencimento", sortable: true, sortAccessor: (r) => r.dueDate, render: (r) => formatShortDate(r.dueDate) },
  { key: "value", header: "Valor", align: "right", sortable: true, sortAccessor: (r) => r.value, render: (r) => formatCurrency(r.value) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={FINANCE_STATUS_MAP} /> },
];

export default function BoletosPage() {
  const tenantSlug = useTenantSlug();
  const boletos = getMockBoletos();
  const [preview, setPreview] = useState<Boleto | null>(null);

  return (
    <>
      <ListPageTemplate<Boleto>
        tenantSlug={tenantSlug}
        breadcrumb={[{ label: "Financeiro", href: "/erp/financeiro" }, { label: "Boletos" }]}
        title="Boletos"
        description="Boletos emitidos para cobrança de clientes."
        primaryAction={{ label: "Emitir boleto" }}
        data={boletos}
        columns={columns}
        getRowId={(r) => r.id}
        searchableFields={["number", "customerName"]}
        searchPlaceholder="Buscar por número ou cliente..."
        rowActions={(r) => (
          <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(r)}>
            <Barcode size={14} />
            Ver boleto
          </Button>
        )}
      />

      <Modal open={preview !== null} onClose={() => setPreview(null)} title="Visualização do boleto" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {preview && (
          <>
            <div className="erp-print-hide mb-4 flex justify-end">
              <PrintButton label="Imprimir boleto" />
            </div>
            <DocumentLayout
              title="Boleto Bancário"
              documentNumber={preview.number}
              issuer={{ name: "Sua Empresa Ltda", document: "00.000.000/0001-00" }}
              meta={[
                { label: "Cliente", value: preview.customerName },
                { label: "Vencimento", value: formatShortDate(preview.dueDate) },
                { label: "Valor", value: formatCurrency(preview.value) },
                { label: "Status", value: FINANCE_STATUS_MAP[preview.status].label },
              ]}
            >
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                <p className="font-mono text-sm tracking-wider text-gray-700">{preview.barcode}</p>
                <p className="mt-3 text-xs text-gray-400">Representação simulada — sem integração bancária real nesta fase.</p>
              </div>
            </DocumentLayout>
          </>
        )}
      </Modal>
    </>
  );
}
