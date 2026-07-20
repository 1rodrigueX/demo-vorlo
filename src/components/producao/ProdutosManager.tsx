"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  createProduto,
  deleteProduto,
  addReceitaItem,
  deleteReceitaItem,
  type ActionState,
} from "@/lib/actions/producao-produtos";
import type { ProducaoProduto, ProducaoReceitaItem, EstoqueItem } from "@/types/domain";

type ProdutoWithEstoque = ProducaoProduto & { estoque_item: EstoqueItem | null };
type ReceitaItemWithMateria = ProducaoReceitaItem & { materia_prima: EstoqueItem | null };

function NovoProdutoForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createProduto, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Produto criado");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="mb-4 flex flex-wrap items-end gap-2">
      <div className="min-w-[160px] flex-1">
        <Label htmlFor="produto-name">Nome do produto</Label>
        <Input id="produto-name" name="name" placeholder="Ex: Cadeira modelo A" required />
      </div>
      <div>
        <Label htmlFor="produto-unit">Unidade</Label>
        <Input id="produto-unit" name="unit" placeholder="un" defaultValue="un" className="w-24" />
      </div>
      <Button type="submit" isLoading={isPending}>
        <Plus size={14} />
        Criar produto
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function ReceitaForm({ produtoId, materiaisDisponiveis }: { produtoId: string; materiaisDisponiveis: EstoqueItem[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(addReceitaItem, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  if (materiaisDisponiveis.length === 0) {
    return <p className="text-xs text-gray-500">Cadastre outros itens em Estoque pra usar como matéria-prima.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="produtoId" value={produtoId} />
      <Select name="materiaPrimaId" required defaultValue="" className="min-w-[160px] flex-1">
        <option value="" disabled>
          Matéria-prima...
        </option>
        {materiaisDisponiveis.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.unit})
          </option>
        ))}
      </Select>
      <Input
        name="quantityPerUnit"
        type="number"
        min="0.0001"
        step="0.0001"
        placeholder="Qtd. por unidade"
        required
        className="w-40"
      />
      <Button type="submit" isLoading={isPending} variant="secondary">
        Adicionar
      </Button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function ReceitaRow({ item }: { item: ReceitaItemWithMateria }) {
  const [isDeleting, startDelete] = useTransition();

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-700">
        {item.materia_prima?.name ?? "Item removido"} — {Number(item.quantity_per_unit)} {item.materia_prima?.unit ?? "un"} por
        unidade
      </span>
      <button
        type="button"
        onClick={() => startDelete(() => deleteReceitaItem(item.id))}
        disabled={isDeleting}
        className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
        aria-label="Remover"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function ProdutoRow({
  produto,
  materiaisDisponiveis,
  receitaByProduto,
  expanded,
  onToggle,
}: {
  produto: ProdutoWithEstoque;
  materiaisDisponiveis: EstoqueItem[];
  receitaByProduto: ReceitaItemWithMateria[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Excluir o produto "${produto.name}"? O item de estoque vinculado não é apagado.`)) return;
    startDelete(() => deleteProduto(produto.id));
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <div>
            <p className="text-sm font-medium text-gray-900">{produto.name}</p>
            <p className="text-xs text-gray-500">
              {Number(produto.estoque_item?.quantity ?? 0)} {produto.estoque_item?.unit ?? "un"} em estoque ·{" "}
              {receitaByProduto.length} item(s) na receita
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
          aria-label={`Excluir ${produto.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-gray-100 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Receita — matéria-prima consumida por unidade produzida
          </p>
          {receitaByProduto.map((item) => (
            <ReceitaRow key={item.id} item={item} />
          ))}
          {receitaByProduto.length === 0 && <p className="text-xs text-gray-500">Nenhuma matéria-prima adicionada.</p>}
          <ReceitaForm
            produtoId={produto.id}
            materiaisDisponiveis={materiaisDisponiveis.filter((m) => m.id !== produto.estoque_item_id)}
          />
        </div>
      )}
    </div>
  );
}

export function ProdutosManager({
  produtos,
  materiaisDisponiveis,
  receitaByProdutoId,
}: {
  produtos: ProdutoWithEstoque[];
  materiaisDisponiveis: EstoqueItem[];
  receitaByProdutoId: Record<string, ReceitaItemWithMateria[]>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-gray-900">Produtos</p>
      <NovoProdutoForm />
      <div className="space-y-2">
        {produtos.map((p) => (
          <ProdutoRow
            key={p.id}
            produto={p}
            materiaisDisponiveis={materiaisDisponiveis}
            receitaByProduto={receitaByProdutoId[p.id] ?? []}
            expanded={expandedId === p.id}
            onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          />
        ))}
        {produtos.length === 0 && <p className="text-sm text-gray-500">Nenhum produto ainda.</p>}
      </div>
    </Card>
  );
}
