"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, PackagePlus, PackageMinus, Pencil, X, Check } from "lucide-react";
import {
  createEstoqueItem,
  deleteEstoqueItem,
  registrarMovimentacao,
  updateEstoqueItem,
  type ActionState,
} from "@/lib/actions/estoque";
import { formatCurrency } from "@/lib/utils/currency";
import type { EstoqueItem, EstoqueMovimentacao } from "@/types/domain";

function inputClass() {
  return "rounded-md border border-[#383835] bg-[#0d0d0d] px-3 py-1.5 text-sm text-white placeholder:text-[#898781] focus:outline-none focus:ring-1 focus:ring-[#3987e5]";
}

function NovoItemForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createEstoqueItem, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Item criado");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <input name="name" placeholder="Nome do item..." required className={`flex-1 ${inputClass()}`} />
      <input name="unit" placeholder="Unidade (un, kg...)" defaultValue="un" className={`w-36 ${inputClass()}`} />
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1 rounded-md bg-[#3987e5] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={14} />
        Adicionar item
      </button>
      {state?.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

function MovimentacaoForm({ itens }: { itens: EstoqueItem[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(registrarMovimentacao, null);
  const [type, setType] = useState<"entrada" | "saida">("entrada");
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success(type === "entrada" ? "Entrada registrada e lançada em Empresarial" : "Saída registrada");
    }
    wasPending.current = isPending;
  }, [isPending, state, type]);

  if (itens.length === 0) {
    return <p className="text-sm text-[#898781]">Crie um item primeiro pra poder registrar movimentação.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("entrada")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            type === "entrada" ? "border-[#199e70] bg-[#199e70]/10 text-[#199e70]" : "border-[#383835] text-[#898781]"
          }`}
        >
          <PackagePlus size={14} />
          Entrada (compra)
        </button>
        <button
          type="button"
          onClick={() => setType("saida")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            type === "saida" ? "border-[#e66767] bg-[#e66767]/10 text-[#e66767]" : "border-[#383835] text-[#898781]"
          }`}
        >
          <PackageMinus size={14} />
          Saída
        </button>
      </div>
      <input type="hidden" name="type" value={type} />

      <select name="itemId" required className={`w-full ${inputClass()}`}>
        {itens.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({Number(item.quantity)} {item.unit} em estoque)
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input name="quantity" type="number" min="0.001" step="0.001" placeholder="Quantidade" required className={inputClass()} />
        {type === "entrada" && (
          <input
            name="unitCostReais"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Custo unitário (R$)"
            required
            className={inputClass()}
          />
        )}
      </div>
      <input name="note" placeholder="Observação (opcional)" className={`w-full ${inputClass()}`} />

      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#3987e5] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Registrar"}
      </button>
    </form>
  );
}

function EditItemForm({
  item,
  onDone,
  canSeeValues,
}: {
  item: EstoqueItem;
  onDone: () => void;
  canSeeValues: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(updateEstoqueItem, null);
  const [isDeleting, startDelete] = useTransition();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Item atualizado");
      onDone();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  function handleDelete() {
    if (!window.confirm(`Excluir "${item.name}"? O histórico de movimentações e lançamentos não é apagado.`)) return;
    startDelete(async () => {
      await deleteEstoqueItem(item.id);
      onDone();
    });
  }

  return (
    <tr className="border-b border-[#2c2c2a] bg-[#0d0d0d] last:border-0">
      <td colSpan={canSeeValues ? 5 : 3} className="py-2 pr-3">
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={item.id} />
          <input name="name" defaultValue={item.name} required className={`min-w-[120px] flex-1 ${inputClass()}`} />
          <input name="unit" defaultValue={item.unit} className={`w-20 ${inputClass()}`} />
          <input
            name="quantity"
            type="number"
            min="0"
            step="0.001"
            defaultValue={Number(item.quantity)}
            required
            className={`w-24 ${inputClass()}`}
          />
          {canSeeValues ? (
            <input
              name="unitCostReais"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(item.unit_cost_cents / 100).toFixed(2)}
              required
              className={`w-28 ${inputClass()}`}
            />
          ) : (
            <input type="hidden" name="unitCostReais" value={(item.unit_cost_cents / 100).toFixed(2)} />
          )}
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1 rounded-md bg-[#199e70] px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check size={12} />
            Salvar
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex items-center gap-1 rounded-md border border-[#383835] px-2.5 py-1.5 text-xs text-[#898781] hover:text-white"
          >
            <X size={12} />
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded-md border border-[#383835] px-2.5 py-1.5 text-xs text-[#898781] transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 size={12} />
            Excluir
          </button>
        </form>
        {state?.error && <p className="mt-1 text-xs text-red-400">{state.error}</p>}
      </td>
    </tr>
  );
}

function ItemRow({ item, canSeeValues }: { item: EstoqueItem; canSeeValues: boolean }) {
  const [isDeleting, startDelete] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  function handleDelete() {
    if (!window.confirm(`Excluir "${item.name}"? O histórico de movimentações e lançamentos não é apagado.`)) return;
    startDelete(() => deleteEstoqueItem(item.id));
  }

  if (isEditing) {
    return <EditItemForm item={item} onDone={() => setIsEditing(false)} canSeeValues={canSeeValues} />;
  }

  const totalValue = (Number(item.quantity) * item.unit_cost_cents) / 100;

  return (
    <tr className="border-b border-[#2c2c2a] last:border-0">
      <td className="py-2 pr-3 text-white">{item.name}</td>
      <td className="py-2 pr-3 text-right text-[#c3c2b7]">
        {Number(item.quantity)} {item.unit}
      </td>
      {canSeeValues && (
        <>
          <td className="py-2 pr-3 text-right text-[#c3c2b7]">{formatCurrency(item.unit_cost_cents / 100)}</td>
          <td className="py-2 pr-3 text-right text-white">{formatCurrency(totalValue)}</td>
        </>
      )}
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[#898781] transition-colors hover:text-white"
            aria-label={`Editar ${item.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-[#898781] transition-colors hover:text-red-400 disabled:opacity-50"
            aria-label={`Excluir ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function EstoqueManager({
  itens,
  movimentacoes,
  canSeeValues,
}: {
  itens: EstoqueItem[];
  movimentacoes: EstoqueMovimentacao[];
  canSeeValues: boolean;
}) {
  const totalEstoque = itens.reduce((sum, i) => sum + (Number(i.quantity) * i.unit_cost_cents) / 100, 0);
  const itemNameById = new Map(itens.map((i) => [i.id, i.name]));

  return (
    <div className="space-y-4">
      {canSeeValues && (
        <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
          <p className="text-xs text-[#898781]">Valor total em estoque</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(totalEstoque)}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
          <p className="mb-3 text-sm font-medium text-[#c3c2b7]">Itens</p>
          <NovoItemForm />
          {itens.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-[#2c2c2a] text-left text-xs text-[#898781]">
                    <th className="pb-2 pr-3 font-normal">Item</th>
                    <th className="pb-2 pr-3 text-right font-normal">Qtd.</th>
                    {canSeeValues && (
                      <>
                        <th className="pb-2 pr-3 text-right font-normal">Custo unit.</th>
                        <th className="pb-2 pr-3 text-right font-normal">Valor total</th>
                      </>
                    )}
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <ItemRow key={item.id} item={item} canSeeValues={canSeeValues} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
          <p className="mb-3 text-sm font-medium text-[#c3c2b7]">Registrar movimentação</p>
          <MovimentacaoForm itens={itens} />
        </div>
      </div>

      {movimentacoes.length > 0 && (
        <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
          <p className="mb-3 text-sm font-medium text-[#c3c2b7]">Movimentações recentes</p>
          <div className="space-y-2">
            {movimentacoes.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {m.type === "entrada" ? (
                    <PackagePlus size={13} className="text-[#199e70]" />
                  ) : (
                    <PackageMinus size={13} className="text-[#e66767]" />
                  )}
                  <span className="text-white">{itemNameById.get(m.item_id) ?? "Item removido"}</span>
                  <span className="text-xs text-[#898781]">
                    {Number(m.quantity)} un · {new Date(m.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {canSeeValues && <span className="text-xs text-[#c3c2b7]">{formatCurrency(m.total_cents / 100)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
