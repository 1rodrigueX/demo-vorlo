"use client";

import { toast } from "sonner";
import { FileCode, FileType } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { FISCAL_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { Button } from "@/components/ui/Button";
import { getMockInvoices, type Invoice } from "@/mocks/erp/invoices";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Invoice>[] = [
  { key: "number", header: "Número", sortable: true, sortAccessor: (r) => r.number, render: (r) => <span className="font-medium text-gray-900">{r.number}</span> },
  { key: "series", header: "Série" },
  { key: "customerName", header: "Cliente" },
  { key: "issueDate", header: "Emissão", sortable: true, sortAccessor: (r) => r.issueDate, render: (r) => formatShortDate(r.issueDate) },
  { key: "value", header: "Valor", align: "right", sortable: true, sortAccessor: (r) => r.value, render: (r) => formatCurrency(r.value) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={FISCAL_STATUS_MAP} /> },
];

export default function FiscalPage() {
  const tenantSlug = useTenantSlug();
  const invoices = getMockInvoices();

  return (
    <ListPageTemplate<Invoice>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Fiscal" }]}
      title="Notas fiscais (NF-e)"
      description="Notas fiscais eletrônicas emitidas, com acesso a XML e DANFE."
      primaryAction={{ label: "Emitir NF-e" }}
      data={invoices}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number", "customerName"]}
      searchPlaceholder="Buscar por número ou cliente..."
      rowActions={() => (
        <div className="flex items-center justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => toast("Emissão fiscal real será implementada em uma fase futura.")}>
            <FileCode size={14} />
            XML
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => toast("Emissão fiscal real será implementada em uma fase futura.")}>
            <FileType size={14} />
            DANFE
          </Button>
        </div>
      )}
    />
  );
}
