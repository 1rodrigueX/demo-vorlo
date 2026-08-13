"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Receipt, Factory, Wallet, Package2, ShoppingBag, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";

type ReportLink = { label: string; description: string; href: string; icon: LucideIcon };

export default function RelatoriosPage() {
  const tenantSlug = useTenantSlug();

  const reports: ReportLink[] = [
    { label: "Relatório de vendas", description: "Vendas realizadas por período, vendedor e status.", href: `/${tenantSlug}/erp/vendas`, icon: Receipt },
    { label: "Relatório de produção", description: "Ordens de produção, quantidade produzida e rejeitada.", href: `/${tenantSlug}/erp/producao/relatorios`, icon: Factory },
    { label: "Relatório financeiro", description: "Evolução do saldo em caixa, entradas e saídas.", href: `/${tenantSlug}/erp/financeiro/fluxo-caixa`, icon: Wallet },
    { label: "Relatório de estoque", description: "Movimentações de entrada, saída e ajuste.", href: `/${tenantSlug}/erp/estoque/movimentacoes`, icon: Package2 },
    { label: "Relatório de compras", description: "Pedidos de compra emitidos e recebimentos.", href: `/${tenantSlug}/erp/compras/pedidos`, icon: ShoppingBag },
    { label: "Relatório de clientes", description: "Base de clientes cadastrados e seus dados.", href: `/${tenantSlug}/erp/cadastros/clientes`, icon: Users },
  ];

  return (
    <div className="space-y-5">
      <ErpBreadcrumb items={[{ label: "Relatórios" }]} tenantSlug={tenantSlug} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-500">Acesso rápido aos principais relatórios do sistema.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.label} href={r.href}>
            <Card className="group flex h-full flex-col gap-3 p-5 transition-colors hover:border-gray-300">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff5722]/10 text-[#ff5722]">
                  <r.icon size={18} strokeWidth={2} />
                </div>
                <ChevronRight size={16} className="mt-1.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                <p className="mt-1 text-xs text-gray-500">{r.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
