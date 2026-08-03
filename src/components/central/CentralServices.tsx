"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Lock, Truck, Wallet, Boxes, Factory, LayoutGrid, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AccountService } from "@/lib/auth/current-user";

const ICONS: Record<AccountService["key"], typeof LayoutDashboard> = {
  crm: LayoutDashboard,
  transportadora: Truck,
  financas: Wallet,
  estoque: Boxes,
  producao: Factory,
};

type Tab = "acessos" | "produtos";

function ServiceCard({ service, mode }: { service: AccountService; mode: Tab }) {
  const Icon = ICONS[service.key];
  // Na aba Produtos, a CTA é sempre "assinar/comprar" pros que faltam; ativos
  // ganham "Acessar". Na aba Meus acessos só entram os ativos.
  const cta = service.active ? "Acessar" : "Assinar";
  return (
    <Link
      href={service.href}
      className="group rounded-2xl border border-gray-200 bg-panel p-6 transition-colors hover:border-gray-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Icon size={20} />
        </div>
        {service.active ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Ativo</span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
            <Lock size={12} />
            {mode === "produtos" ? "Disponível" : "Não assinado"}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{service.name}</h3>
      <p className="mt-1 text-sm text-gray-500">{service.description}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600">
        {cta}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/** Central em abas: "Meus acessos" (o que já está ativo) e "Produtos" (tudo
 * que dá pra assinar/comprar). */
export function CentralServices({ services }: { services: AccountService[] }) {
  const ativos = services.filter((s) => s.active);
  const hasAnyActive = ativos.length > 0;
  const [tab, setTab] = useState<Tab>(hasAnyActive ? "acessos" : "produtos");

  const list = tab === "acessos" ? ativos : services;

  return (
    <div>
      <div className="mx-auto mb-8 flex w-fit rounded-full border border-gray-200 bg-panel p-1">
        <TabButton active={tab === "acessos"} onClick={() => setTab("acessos")} icon={LayoutGrid}>
          Meus acessos
        </TabButton>
        <TabButton active={tab === "produtos"} onClick={() => setTab("produtos")} icon={ShoppingBag}>
          Produtos
        </TabButton>
      </div>

      {tab === "acessos" && !hasAnyActive ? (
        <div className="rounded-2xl border border-gray-200 bg-panel p-10 text-center">
          <p className="text-sm text-gray-500">
            Você ainda não assinou nenhum serviço. Veja os{" "}
            <button type="button" onClick={() => setTab("produtos")} className="font-medium text-indigo-600 hover:underline">
              Produtos
            </button>{" "}
            disponíveis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((service) => (
            <ServiceCard key={service.key} service={service} mode={tab} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800",
      )}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}
