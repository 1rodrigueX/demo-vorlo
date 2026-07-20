import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { DealFormModal } from "@/components/pipeline/DealFormModal";
import type { DealWithContact } from "@/types/domain";

export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ vendedor?: string; produto?: string }>;
}) {
  const { tenantSlug } = await params;
  const { vendedor, produto } = await searchParams;
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  // Membro comum já só enxerga os próprios negócios via RLS (deals_select_own_or_admin)
  // — o filtro por vendedor/produto é um recurso de visão completa, só faz
  // sentido pro dono/gerente que vê o pipeline inteiro.
  const isAdmin = currentUser?.profile?.role === "owner" || currentUser?.profile?.role === "manager";

  const [{ data: stages }, { data: contacts }, { data: hasEstoque }] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("position"),
    supabase.from("contacts").select("id, name").order("name"),
    supabase.rpc("current_tenant_has_estoque"),
  ]);

  let sellers: { id: string; full_name: string | null }[] = [];
  let produtos: { id: string; name: string }[] = [];
  if (isAdmin) {
    const [{ data: sellerRows }, produtosResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name").order("full_name"),
      hasEstoque
        ? supabase.from("estoque_itens").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);
    sellers = sellerRows ?? [];
    produtos = produtosResult.data ?? [];
  }

  let dealIdsFromProduto: string[] | null = null;
  if (isAdmin && produto) {
    const { data: rows } = await supabase.from("deal_produtos").select("deal_id").eq("estoque_item_id", produto);
    dealIdsFromProduto = (rows ?? []).map((r) => r.deal_id);
  }

  let dealsQuery = supabase
    .from("deals")
    .select("*, contact:contacts(id, name, phone), owner:profiles(id, full_name, color)")
    .order("position");
  if (isAdmin && vendedor) dealsQuery = dealsQuery.eq("owner_id", vendedor);
  if (dealIdsFromProduto) dealsQuery = dealsQuery.in("id", dealIdsFromProduto.length ? dealIdsFromProduto : ["-"]);

  const { data: deals } = await dealsQuery;

  const activeSeller = sellers.find((s) => s.id === vendedor);
  const activeProduto = produtos.find((p) => p.id === produto);
  const hasActiveFilter = isAdmin && !!(vendedor || produto);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">Arraste os negócios entre os estágios.</p>
        </div>
        <DealFormModal stages={stages ?? []} contacts={contacts ?? []} />
      </div>

      {isAdmin && (sellers.length > 0 || produtos.length > 0) && (
        <form className="mb-4 flex flex-wrap items-center gap-2">
          {sellers.length > 0 && (
            <select
              name="vendedor"
              defaultValue={vendedor ?? ""}
              className="rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os vendedores</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          )}
          {produtos.length > 0 && (
            <select
              name="produto"
              defaultValue={produto ?? ""}
              className="rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os produtos</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Filtrar
          </button>
          {hasActiveFilter && (
            <Link
              href={`/${tenantSlug}/pipeline`}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
              limpar
            </Link>
          )}
        </form>
      )}

      {hasActiveFilter && (
        <div className="mb-4 text-sm text-gray-600">
          Filtrando por:{" "}
          {activeSeller && <span className="font-medium text-gray-900">{activeSeller.full_name}</span>}
          {activeSeller && activeProduto && " · "}
          {activeProduto && <span className="font-medium text-gray-900">{activeProduto.name}</span>}
        </div>
      )}

      <KanbanBoard stages={stages ?? []} initialDeals={(deals ?? []) as unknown as DealWithContact[]} />
    </div>
  );
}
