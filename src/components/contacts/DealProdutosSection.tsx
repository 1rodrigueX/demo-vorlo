"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Package, ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import {
  addDealProduto,
  removeDealProduto,
  getDealProdutosForDeal,
  type ActionState,
  type DealProdutoWithItem,
} from "@/lib/actions/deal-produtos";
import type { EstoqueItem } from "@/types/domain";

export function DealProdutosSection({
  dealId,
  initialProdutos,
  estoqueItens,
}: {
  dealId: string;
  initialProdutos: DealProdutoWithItem[];
  estoqueItens: EstoqueItem[];
}) {
  const [open, setOpen] = useState(false);
  const [produtos, setProdutos] = useState(initialProdutos);
  const [isRefreshing, startRefresh] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(addDealProduto, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  function refresh() {
    startRefresh(async () => {
      const data = await getDealProdutosForDeal(dealId);
      setProdutos(data);
    });
  }

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      refresh();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  function handleDelete(id: string) {
    startDelete(async () => {
      await removeDealProduto(id);
      refresh();
    });
  }

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <Package size={12} />
        Produtos vendidos ({produtos.length})
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {(isRefreshing || isDeleting) && <p className="text-xs text-gray-400">Atualizando...</p>}
          {produtos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-700">
                {p.estoque_item?.name ?? "Item removido"} — {Number(p.quantity)} {p.estoque_item?.unit ?? "un"}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="text-gray-400 hover:text-red-500"
                aria-label="Remover"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {produtos.length === 0 && <p className="text-xs text-gray-400">Nenhum produto vinculado ainda.</p>}

          {estoqueItens.length === 0 ? (
            <p className="text-xs text-gray-400">Cadastre itens em Estoque pra poder vincular aqui.</p>
          ) : (
            <form ref={formRef} action={formAction} className="flex items-center gap-1.5">
              <input type="hidden" name="dealId" value={dealId} />
              <select
                name="estoqueItemId"
                required
                defaultValue=""
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-panel px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>
                  Produto...
                </option>
                {estoqueItens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                name="quantity"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="Qtd."
                required
                className="w-16 rounded-md border border-gray-300 bg-panel px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Plus size={12} />
              </button>
            </form>
          )}
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        </div>
      )}
    </div>
  );
}
