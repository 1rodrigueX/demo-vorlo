import { redirect } from "next/navigation";
import { PackagePlus, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTurnos, getMaquinas, getEstilos } from "@/lib/actions/producao-config";
import { getProdutos } from "@/lib/actions/producao-produtos";
import { getRecentApontamentos } from "@/lib/actions/producao-apontamento";
import { logout } from "@/lib/actions/auth";
import { ApontamentoForm } from "@/components/producao/ApontamentoForm";

export default async function ApontamentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_producao_actor", { p_user_id: user.id });
  if (!hasAccess) redirect("/login");

  const [turnos, maquinas, estilos, produtos, apontamentos, { data: proprioFuncionario }] = await Promise.all([
    getTurnos(),
    getMaquinas(),
    getEstilos(),
    getProdutos(),
    getRecentApontamentos(),
    supabase.from("producao_funcionarios").select("full_name, turno_id, maquina_id").eq("id", user.id).maybeSingle(),
  ]);

  const produtoNome = new Map(produtos.map((p) => [p.id, p.name]));
  const turnoNome = new Map(turnos.map((t) => [t.id, t.name]));
  const maquinaNome = new Map(maquinas.map((m) => [m.id, m.name]));

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus size={20} className="text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              {proprioFuncionario ? `Lançar Produção — ${proprioFuncionario.full_name}` : "Lançar Produção"}
            </h1>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              <LogOut size={15} />
              Sair
            </button>
          </form>
        </div>

        <div className="mt-6 space-y-4">
          <ApontamentoForm
            produtos={produtos}
            turnos={turnos}
            maquinas={maquinas}
            estilos={estilos}
            defaultTurnoId={proprioFuncionario?.turno_id ?? null}
            defaultMaquinaId={proprioFuncionario?.maquina_id ?? null}
          />

          {apontamentos.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-panel p-4">
              <p className="mb-3 text-sm font-medium text-gray-900">Últimos registros</p>
              <div className="space-y-2">
                {apontamentos.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{produtoNome.get(a.produto_id) ?? "Produto"}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {a.turno_id ? turnoNome.get(a.turno_id) : ""} {a.maquina_id ? `· ${maquinaNome.get(a.maquina_id)}` : ""}
                      </span>
                    </div>
                    <span className="text-gray-700">
                      {Number(a.quantity)}
                      {Number(a.perdas) > 0 && <span className="text-red-500"> (perda: {Number(a.perdas)})</span>} ·{" "}
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
