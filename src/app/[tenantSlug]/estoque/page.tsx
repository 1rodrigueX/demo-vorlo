import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEstoqueItens, getRecentMovimentacoes } from "@/lib/actions/estoque";
import { EstoqueManager } from "@/components/financas/EstoqueManager";
import { resolveHomeRoute } from "@/lib/auth/current-user";

export default async function EstoquePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_estoque");
  if (!hasAccess) redirect("/comprar-estoque");

  const [itens, movimentacoes] = await Promise.all([getEstoqueItens(), getRecentMovimentacoes()]);
  const backHref = await resolveHomeRoute();

  return (
    <div className="min-h-screen px-6 py-6" style={{ background: "#0d0d0d", color: "#ffffff" }}>
      <div className="mx-auto max-w-4xl">
        <Link href={backHref} className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#898781] hover:text-white">
          <ArrowLeft size={14} />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-white">Controle de Estoque</h1>
        <p className="mt-1 text-sm text-[#898781]">
          Toda entrada (compra) já lança automaticamente como saída em Empresarial, se você também tiver o Financeiro
          ativo.
        </p>

        <div className="mt-6">
          <EstoqueManager itens={itens} movimentacoes={movimentacoes} />
        </div>
      </div>
    </div>
  );
}
