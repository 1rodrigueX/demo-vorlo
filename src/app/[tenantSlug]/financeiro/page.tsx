import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

/**
 * Landing do Controle de Finanças — fora do (dashboard) do CRM de propósito:
 * um tenant que só comprou Finanças (sem CRM) não deve ver o sidebar cheio
 * de Pipeline/Empresas/etc que não usa. Dashboard de verdade (lançamentos,
 * boletos, extrato) ainda não foi construído — isso só garante que quem já
 * tem o produto ativo cai em algo real, não um 404, enquanto isso.
 */
export default async function FinanceiroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_financas");
  if (!hasAccess) redirect("/comprar-financas");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-panel p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Wallet size={28} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Controle de Finanças</h1>
        <p className="mt-2 text-sm text-gray-600">
          Seu acesso já está ativo. O painel completo (fluxo de caixa, boletos, extrato bancário) está em
          construção — em breve liberamos por aqui.
        </p>
        <Link href="/central">
          <Button variant="secondary" className="mt-6 w-full">
            Voltar pra central
          </Button>
        </Link>
      </div>
    </div>
  );
}
