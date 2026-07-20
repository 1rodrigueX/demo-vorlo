import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTurnos, getMaquinas, getEstilos } from "@/lib/actions/producao-config";
import { getProdutos, getEstoqueItensParaReceita, getAllReceitaItens } from "@/lib/actions/producao-produtos";
import { getFuncionarios } from "@/lib/actions/producao-funcionarios";
import { TurnosManager } from "@/components/producao/TurnosManager";
import { MaquinasManager } from "@/components/producao/MaquinasManager";
import { EstilosManager } from "@/components/producao/EstilosManager";
import { ProdutosManager } from "@/components/producao/ProdutosManager";
import { FuncionariosManager } from "@/components/producao/FuncionariosManager";

export default async function ProducaoConfiguracoesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_producao");
  if (!hasAccess) redirect("/comprar-producao");

  const [turnos, maquinas, estilos, produtos, materiaisDisponiveis, receitaItens, funcionarios] = await Promise.all([
    getTurnos(),
    getMaquinas(),
    getEstilos(),
    getProdutos(),
    getEstoqueItensParaReceita(),
    getAllReceitaItens(),
    getFuncionarios(),
  ]);

  const receitaByProdutoId = receitaItens.reduce<Record<string, typeof receitaItens>>((acc, item) => {
    (acc[item.produto_id] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${tenantSlug}/producao`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Configurações de Produção</h1>
        <p className="mt-1 text-sm text-gray-500">
          Turnos, máquinas, estilos de produção e o catálogo de produtos — tudo customizável.
        </p>

        <div className="mt-6 space-y-4">
          <TurnosManager turnos={turnos} />
          <MaquinasManager maquinas={maquinas} />
          <EstilosManager estilos={estilos} />
          <ProdutosManager
            produtos={produtos}
            materiaisDisponiveis={materiaisDisponiveis}
            receitaByProdutoId={receitaByProdutoId}
          />
          <FuncionariosManager funcionarios={funcionarios} turnos={turnos} maquinas={maquinas} />
        </div>
      </div>
    </div>
  );
}
