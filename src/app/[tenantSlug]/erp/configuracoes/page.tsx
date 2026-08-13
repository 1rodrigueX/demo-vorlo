"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Building2, KeyRound, Bell, Palette, Plug, FileStack, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";

type SettingCard = { label: string; description: string; icon: LucideIcon; href?: string };

export default function ConfiguracoesPage() {
  const tenantSlug = useTenantSlug();

  const settings: SettingCard[] = [
    { label: "Empresa", description: "Razão social, CNPJ, endereço e filiais.", icon: Building2 },
    { label: "Usuários e permissões", description: "Contas de acesso e níveis de permissão.", icon: KeyRound, href: `/${tenantSlug}/erp/cadastros/usuarios` },
    { label: "Configuração fiscal", description: "Regime tributário, ambiente e certificado digital.", icon: FileStack, href: `/${tenantSlug}/erp/fiscal/configuracao` },
    { label: "Notificações", description: "Alertas de estoque, vencimentos e produção." , icon: Bell },
    { label: "Aparência", description: "Tema, densidade e identidade visual do sistema.", icon: Palette },
    { label: "Integrações", description: "Conexões com bancos, marketplaces e nota fiscal.", icon: Plug },
  ];

  return (
    <div className="space-y-5">
      <ErpBreadcrumb items={[{ label: "Configurações" }]} tenantSlug={tenantSlug} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Preferências gerais do sistema.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settings.map((s) => {
          const content = (
            <Card className="group flex h-full flex-col gap-3 p-5 transition-colors hover:border-gray-300">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <s.icon size={18} strokeWidth={2} />
                </div>
                {s.href ? (
                  <ChevronRight size={16} className="mt-1.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-400" />
                ) : (
                  <Badge className="bg-gray-100 text-gray-500">Em breve</Badge>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                <p className="mt-1 text-xs text-gray-500">{s.description}</p>
              </div>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {content}
            </Link>
          ) : (
            <div key={s.label} className="cursor-not-allowed opacity-90">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
