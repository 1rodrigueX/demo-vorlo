import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Lock, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAccountServices, type AccountService } from "@/lib/auth/current-user";
import { UserMenu } from "@/components/layout/UserMenu";

const ICONS: Record<AccountService["key"], typeof LayoutDashboard> = {
  crm: LayoutDashboard,
  transportadora: Truck,
};

export default async function CentralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { services, ownerName } = await getAccountServices();
  const hasAnyActive = services.some((service) => service.active);
  const email = user.email ?? "";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <header className="mx-auto flex max-w-4xl items-center justify-between pb-10">
        <span className="text-sm font-semibold text-gray-900">FALA AI</span>
        <UserMenu name={ownerName || email || "Usuário"} email={email} />
      </header>

      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {ownerName ? `Olá, ${ownerName.split(" ")[0]}!` : "Sua central"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {hasAnyActive
              ? "Escolha qual serviço você quer acessar."
              : "Você ainda não tem nenhum serviço ativo — assine um abaixo pra começar."}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {services.map((service) => {
            const Icon = ICONS[service.key];
            return (
              <Link
                key={service.key}
                href={service.href}
                className="group rounded-2xl border border-gray-200 bg-panel p-6 transition-colors hover:border-gray-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Icon size={20} />
                  </div>
                  {service.active ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      <Lock size={12} />
                      Não assinado
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{service.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600">
                  {service.active ? "Acessar" : "Assinar"}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
