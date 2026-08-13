"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { QUOTE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { Select } from "@/components/ui/Select";
import { getMockQuotes, getQuoteTotal, type Quote, type QuoteStatus } from "@/mocks/erp/quotes";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const STATUS_OPTIONS: { value: QuoteStatus | "todos"; label: string }[] = [
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

export default function PropostasPage() {
  const tenantSlug = useTenantSlug();
  const quotes = getMockQuotes();
  const [status, setStatus] = useState<string>("todos");
  const [period, setPeriod] = useState<string>("todos");

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (status !== "todos" && q.status !== status) return false;
      if (period !== "todos" && differenceInDays(new Date(), new Date(q.date)) > Number(period)) return false;
      return true;
    });
  }, [quotes, status, period]);

  const columns: DataTableColumn<Quote>[] = [
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
    { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
    { key: "customerName", header: "Cliente" },
    { key: "sellerName", header: "Vendedor" },
    {
      key: "total",
      header: "Valor",
      align: "right",
      sortable: true,
      sortAccessor: (r) => getQuoteTotal(r),
      render: (r) => formatCurrency(getQuoteTotal(r)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={QUOTE_STATUS_MAP} /> },
  ];

  return (
    <ListPageTemplate<Quote>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Vendas", href: "/erp/vendas" }, { label: "Propostas comerciais" }]}
      title="Propostas comerciais"
      description="Propostas enviadas e seu andamento até a aprovação."
      primaryAction={{ label: "Nova proposta", href: `/${tenantSlug}/erp/vendas/propostas/nova` }}
      data={filtered}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number", "customerName", "sellerName"]}
      searchPlaceholder="Buscar por número, cliente ou vendedor..."
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
