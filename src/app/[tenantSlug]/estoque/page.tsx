import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEstoqueItens, getRecentMovimentacoes } from "@/lib/actions/estoque";
import { EstoqueManager } from "@/components/financas/EstoqueManager";
import { resolveHomeRoute, getCurrentUser } from "@/lib/auth/current-user";

export default async function EstoquePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_estoque");
  if (!hasAccess) redirect("/comprar-estoque");

  const [itens, movimentacoes, currentUser] = await Promise.all([
    getEstoqueItens(),
    getRecentMovimentacoes(),
    getCurrentUser(),
  ]);
  const canSeeValues = currentUser?.profile?.role === "owner" || currentUser?.profile?.role === "manager";
  const backHref = await resolveHomeRoute();

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-6" style={{ background: "#05060c", color: "#e8eaf2" }}>
      {/* Halos neon de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.14), transparent 60%)", filter: "blur(40px)" }}
        />
        <div
          className="absolute -right-40 top-24 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12), transparent 60%)", filter: "blur(40px)" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <Link href={backHref} className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#8b93a7] transition-colors hover:text-white">
          <ArrowLeft size={14} />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-white">Controle de Estoque</h1>
        <p className="mt-1 text-sm text-[#8b93a7]">
          Toda entrada (compra) já lança automaticamente como saída em Empresarial, se você também tiver o Financeiro
          ativo.
        </p>

        <div className="mt-6">
          <EstoqueManager itens={itens} movimentacoes={movimentacoes} canSeeValues={canSeeValues} />
        </div>
      </div>
    </div>
  );
}
