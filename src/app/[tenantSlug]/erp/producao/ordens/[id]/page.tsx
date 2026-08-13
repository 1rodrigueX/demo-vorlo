"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { FileBarChart2, User, Wrench, Calendar, Package } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { PRODUCTION_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockProductionOrderById } from "@/mocks/erp/productionOrders";
import { formatShortDate } from "@/components/erp/lib/format";
import { cn } from "@/lib/utils/cn";

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

export default function OrdemDeProducaoDetalhePage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>();
  const op = getMockProductionOrderById(id);
  if (!op) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <ErpBreadcrumb items={[{ label: "Produção", href: "/erp/producao" }, { label: op.number }]} tenantSlug={tenantSlug} />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{op.number}</h1>
            <StatusBadge status={op.status} map={PRODUCTION_STATUS_MAP} />
          </div>
        </div>
        <Link href={`/${tenantSlug}/erp/producao/ordens/${op.id}/relatorio`}>
          <Button type="button" variant="secondary">
            <FileBarChart2 size={16} />
            Ver relatório de produção
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <InfoRow icon={Package} label="Pedido" value={op.orderNumber} />
          <InfoRow icon={User} label="Cliente" value={op.customerName} />
          <InfoRow icon={Package} label="Produto" value={op.productName} />
          <InfoRow icon={User} label="Operador" value={op.operator} />
          <InfoRow icon={Wrench} label="Máquina" value={op.machine} />
          <InfoRow icon={Calendar} label="Início" value={formatShortDate(op.startDate)} />
          <InfoRow icon={Calendar} label="Previsão/Fim" value={op.endDate ? formatShortDate(op.endDate) : "Em andamento"} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Progresso e matéria-prima</h2>
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {op.quantityProduced.toLocaleString("pt-BR")} de {op.quantityPlanned.toLocaleString("pt-BR")} un.
            </span>
            <span className="font-medium text-gray-900">{op.progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn("h-full rounded-full", op.progressPct >= 100 ? "bg-emerald-500" : "bg-[#ff5722]")}
              style={{ width: `${Math.min(op.progressPct, 100)}%` }}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Matéria-prima prevista</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{op.rawMaterialPlanned}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Matéria-prima utilizada</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{op.rawMaterialUsed}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-xs text-red-600">Quantidade rejeitada</p>
            <p className="mt-1 text-sm font-medium text-red-700">{op.quantityRejected} un.</p>
          </div>
        </div>
        {op.notes && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{op.notes}</p>}
      </Card>
    </div>
  );
}
