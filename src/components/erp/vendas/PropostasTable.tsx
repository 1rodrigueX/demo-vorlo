"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { QUOTE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { Select } from "@/components/ui/Select";
import type { ErpPropostaWithRelations } from "@/lib/actions/erp-propostas";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "visualizada", label: "Visualizada" },
  { value: "negociacao", label: "Negociação" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
  { value: "expirada", label: "Expirada" },
  { value: "cancelada", label: "Cancelada" },
];

const PERIOD_OPTIONS = [
  { value: "todos", label: "Qualquer período" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

function propostaTotal(p: ErpPropostaWithRelations): number {
  const subtotal = p.itens.reduce((s, i) => s + (i.unit_price_cents / 100) * i.quantity * (1 - i.discount_pct / 100), 0);
  return subtotal + p.freight_cents / 100 - p.discount_cents / 100;
}

export function PropostasTable({ tenantSlug, initialPropostas }: { tenantSlug: string; initialPropostas: ErpPropostaWithRelations[] }) {
  const [status, setStatus] = useState<string>("todos");
  const [period, setPeriod] = useState<string>("todos");

  const filtered = useMemo(() => {
    return initialPropostas.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (period !== "todos" && differenceInDays(new Date(), new Date(p.created_at)) > Number(period)) return false;
      return true;
    });
  }, [initialPropostas, status, period]);

  const columns: DataTableColumn<ErpPropostaWithRelations>[] = [
    {
      key: "number",
      header: "Número",
      sortable: true,
      sortAccessor: (r) => r.number,
      render: (r) => (
        <Link href={`/${tenantSlug}/erp/vendas/propostas/${r.id}`} className="font-medium text-[#ff5722] hover:underline">
          {r.number}
        </Link>
      ),
    },
    { key: "quote_date", header: "Data", sortable: true, sortAccessor: (r) => r.quote_date, render: (r) => formatShortDate(r.quote_date) },
    { key: "contact", header: "Cliente", render: (r) => r.contact?.name ?? "—" },
    { key: "seller", header: "Vendedor", render: (r) => r.seller?.full_name ?? "—" },
    {
      key: "total",
      header: "Valor",
      align: "right",
      sortable: true,
      sortAccessor: (r) => propostaTotal(r),
      render: (r) => formatCurrency(propostaTotal(r)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={QUOTE_STATUS_MAP} /> },
  ];

  return (
    <ListPageTemplate<ErpPropostaWithRelations>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Vendas", href: "/erp/vendas" }, { label: "Propostas comerciais" }]}
      title="Propostas comerciais"
      description="Propostas enviadas e seu andamento até a aprovação."
      primaryAction={{ label: "Nova proposta", href: `/${tenantSlug}/erp/vendas/propostas/nova` }}
      data={filtered}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number"]}
      searchPlaceholder="Buscar por número..."
      filtersSlot={
        <>
          <div className="w-full sm:w-40">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </>
      }
    />
  );
}
