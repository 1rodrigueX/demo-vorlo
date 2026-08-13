"use client";

import Link from "next/link";
import { FileBarChart2 } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { PRODUCTION_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { Button } from "@/components/ui/Button";
import { getMockProductionOrders, type ProductionOrder } from "@/mocks/erp/productionOrders";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

export default function RelatoriosDeProducaoPage() {
  const tenantSlug = useTenantSlug();
  const orders = getMockProductionOrders();

  const columns: DataTableColumn<ProductionOrder>[] = [
    {
      key: "number",
      header: "OP",
      sortable: true,
      sortAccessor: (r) => r.number,
      render: (r) => (
        <Link href={`/${tenantSlug}/erp/producao/ordens/${r.id}`} className="font-medium text-[#ff5722] hover:underline">
          {r.number}
        </Link>
      ),
    },
    { key: "orderNumber", header: "Pedido" },
    { key: "customerName", header: "Cliente" },
    { key: "productName", header: "Produto" },
    { key: "quantityProduced", header: "Produzido", align: "right", render: (r) => r.quantityProduced.toLocaleString("pt-BR") },
    { key: "endDate", header: "Concluído em", render: (r) => (r.endDate ? formatShortDate(r.endDate) : "—") },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={PRODUCTION_STATUS_MAP} /> },
  ];

  return (
    <ListPageTemplate<ProductionOrder>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Produção", href: "/erp/producao" }, { label: "Relatórios" }]}
      title="Relatórios de produção"
      description="Relatório detalhado de cada ordem de produção, pronto para impressão."
      data={orders}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number", "orderNumber", "customerName", "productName"]}
      searchPlaceholder="Buscar por OP, pedido, cliente ou produto..."
      rowActions={(r) => (
        <Link href={`/${tenantSlug}/erp/producao/ordens/${r.id}/relatorio`}>
          <Button type="button" variant="ghost" size="sm">
            <FileBarChart2 size={14} />
            Ver relatório
          </Button>
        </Link>
      )}
    />
  );
}
