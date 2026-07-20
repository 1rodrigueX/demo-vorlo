import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Factory, PackagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTurnos, getMaquinas, getEstilos } from "@/lib/actions/producao-config";
import { getProdutos } from "@/lib/actions/producao-produtos";

export default async function ProducaoPage({
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

  const [turnos, maquinas, estilos, produtos] = await Promise.all([
    getTurnos(),
    getMaquinas(),
    getEstilos(),
    getProdutos(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory size={20} className="text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Controle de Produção</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${tenantSlug}/producao/configuracoes`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings size={14} />
              Configurações
            </Link>
            <Link
              href={`/${tenantSlug}/producao/apontamento`}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <PackagePlus size={14} />
              Lançar Produção
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Turnos" value={turnos.length} />
          <StatTile label="Máquinas" value={maquinas.length} />
          <StatTile label="Estilos" value={estilos.length} />
          <StatTile label="Produtos" value={produtos.length} />
        </div>

        {(turnos.length === 0 || maquinas.length === 0 || produtos.length === 0) && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-panel p-6 text-center">
            <p className="text-sm text-gray-500">
              Configure turnos, máquinas e produtos antes de começar a lançar produção.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-panel p-4 text-center">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
