"use client";

import Link from "next/link";
import { ClipboardList, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { PRODUCTION_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockProductionOrders, type ProductionOrder } from "@/mocks/erp/productionOrders";
import { getMockProductionSummary } from "@/mocks/erp/dashboard";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { cn } from "@/lib/utils/cn";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full", value >= 100 ? "bg-emerald-500" : value > 0 ? "bg-[#ff5722]" : "bg-gray-300")}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-xs text-gray-500">{value}%</span>
    </div>
  );
}

export default function ProducaoPage() {
  const tenantSlug = useTenantSlug();
  const orders = getMockProductionOrders();
  const summary = getMockProductionSummary();

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
    { key: "quantityPlanned", header: "Quantidade", align: "right", render: (r) => r.quantityPlanned.toLocaleString("pt-BR") },
    { key: "progressPct", header: "Progresso", render: (r) => <ProgressBar value={r.progressPct} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={PRODUCTION_STATUS_MAP} /> },
  ];

  return (
    <ListPageTemplate<ProductionOrder>
      tenantSlug={tenantSlug}
      title="Produção"
      description="Ordens de produção e acompanhamento de progresso."
      primaryAction={{ label: "Nova ordem de produção" }}
      statCards={[
        { label: "Planejadas", value: summary.planned, icon: ClipboardList },
        { label: "Em produção", value: summary.inProgress, icon: Loader2 },
        { label: "Atrasadas", value: summary.late, icon: AlertTriangle, tone: "danger" },
        { label: "Concluídas", value: summary.completed, icon: CheckCircle2, tone: "success" },
      ]}
      data={orders}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number", "orderNumber", "customerName", "productName"]}
      searchPlaceholder="Buscar por OP, pedido, cliente ou produto..."
    />
  );
}
