import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLancamentos } from "@/lib/actions/financas";
import { FinanceiroDashboard } from "@/components/financas/FinanceiroDashboard";

/**
 * Dashboard do Controle de Finanças — fora do (dashboard) do CRM de
 * propósito: um tenant que só comprou Finanças (sem CRM) não deve ver o
 * sidebar cheio de Pipeline/Empresas/etc que não usa. Tema escuro é
 * intencional aqui (fixo, não segue o resto do site) — pedido explícito a
 * partir de uma referência visual.
 */
export default async function FinanceiroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_financas");
  if (!hasAccess) redirect("/comprar-financas");

  const year = new Date().getFullYear();
  const lancamentos = await getLancamentos("pessoal", year);

  return <FinanceiroDashboard initialLancamentos={lancamentos} initialYear={year} />;
}
