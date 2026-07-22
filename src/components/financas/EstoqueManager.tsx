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
import { cn } from "@/lib/utils/cn";
import { Sparkline } from "@/components/financas/charts";
import type { EstoqueItem, EstoqueMovimentacao } from "@/types/domain";

/** Neon do módulo escuro. */
const NEON = {
  cyan: "#22d3ee",
  violet: "#a855f7",
  green: "#22c55e",
  blue: "#38bdf8",
  red: "#f04f6a",
} as const;

function inputClass() {
  return "rounded-lg border border-white/10 bg-[#0a0c14] px-3 py-1.5 text-sm text-white placeholder:text-[#8b93a7] focus:outline-none focus:ring-2 focus:ring-[#22d3ee]/60";
}

/** Card de vidro escuro com borda/halo neon. */
function NeonCard({
  accent,
  className,
  children,
}: {
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative rounded-2xl", className)}
      style={{
        padding: 1,
        background: `linear-gradient(150deg, ${accent}88, ${accent}14 45%, rgba(255,255,255,0.04) 85%)`,
        boxShadow: `0 0 16px -16px ${accent}`,
      }}
    >
      <div className="h-full rounded-[15px] bg-[#0a0c14]/95 p-4 backdrop-blur-xl">{children}</div>
    </div>
  );
}

function PanelHeading({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full" style={{ background: accent, boxShadow: `0 0 4px ${accent}88` }} />
      <p className="text-sm font-medium text-[#c3c7d4]">{title}</p>
    </div>
  );
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
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.violet})`, boxShadow: `0 0 12px -9px ${NEON.cyan}` }}
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
    return <p className="text-sm text-[#8b93a7]">Crie um item primeiro pra poder registrar movimentação.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("entrada")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
            type === "entrada" ? "text-white" : "border-white/10 text-[#8b93a7] hover:text-white",
          )}
          style={
            type === "entrada"
              ? { borderColor: `${NEON.green}66`, background: `${NEON.green}14`, color: NEON.green, boxShadow: `0 0 12px -10px ${NEON.green}` }
              : undefined
          }
        >
          <PackagePlus size={14} />
          Entrada (compra)
        </button>
        <button
          type="button"
          onClick={() => setType("saida")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
            type === "saida" ? "text-white" : "border-white/10 text-[#8b93a7] hover:text-white",
          )}
          style={
            type === "saida"
              ? { borderColor: `${NEON.blue}66`, background: `${NEON.blue}14`, color: NEON.blue, boxShadow: `0 0 12px -10px ${NEON.blue}` }
              : undefined
          }
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
        className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.violet})`, boxShadow: `0 0 12px -9px ${NEON.cyan}` }}
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
    <tr className="border-b border-white/10 bg-white/[0.02] last:border-0">
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
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: NEON.green, boxShadow: `0 0 10px -8px ${NEON.green}` }}
          >
            <Check size={12} />
            Salvar
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[#8b93a7] hover:text-white"
          >
            <X size={12} />
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[#8b93a7] transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
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
    <tr className="border-b border-white/10 transition-colors last:border-0 hover:bg-white/[0.02]">
      <td className="py-2 pr-3 text-white">{item.name}</td>
      <td className="py-2 pr-3 text-right text-[#c3c7d4]">
        {Number(item.quantity)} {item.unit}
      </td>
      {canSeeValues && (
        <>
          <td className="py-2 pr-3 text-right text-[#c3c7d4]">{formatCurrency(item.unit_cost_cents / 100)}</td>
          <td className="py-2 pr-3 text-right font-medium text-white">{formatCurrency(totalValue)}</td>
        </>
      )}
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[#8b93a7] transition-colors hover:text-white"
            aria-label={`Editar ${item.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-[#8b93a7] transition-colors hover:text-red-400 disabled:opacity-50"
            aria-label={`Excluir ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Série de valor do estoque nos últimos 30 dias — reconstruída a partir das
 * movimentações (entrada +, saída −) ancorando o último ponto no total atual. */
function buildValueSparkline(movimentacoes: EstoqueMovimentacao[], currentTotal: number): { value: number }[] {
  const DAYS = 30;
  const perDay = new Array(DAYS).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const m of movimentacoes) {
    const d = new Date(m.created_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < DAYS) {
      perDay[DAYS - 1 - diff] += (m.type === "entrada" ? 1 : -1) * (m.total_cents / 100);
    }
  }
  const windowSum = perDay.reduce((s, v) => s + v, 0);
  let running = currentTotal - windowSum;
  const points: { value: number }[] = [];
  for (let i = 0; i < DAYS; i++) {
    running += perDay[i];
    points.push({ value: running });
  }
  return points;
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
  const valueSparkline = buildValueSparkline(movimentacoes, totalEstoque);

  return (
    <div className="space-y-4">
      {canSeeValues && (
        <NeonCard accent={NEON.cyan}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#8b93a7]">Valor total em estoque</p>
              <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(totalEstoque)}</p>
            </div>
            <div className="w-40 shrink-0 sm:w-64">
              <p className="mb-1 text-right text-[11px] text-[#8b93a7]">Valor em 30 dias</p>
              <Sparkline data={valueSparkline} color={NEON.cyan} />
            </div>
          </div>
        </NeonCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NeonCard accent={NEON.cyan}>
          <PanelHeading title="Itens" accent={NEON.cyan} />
          <NovoItemForm />
          {itens.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-[#8b93a7]">
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
        </NeonCard>

        <NeonCard accent={NEON.violet}>
          <PanelHeading title="Registrar movimentação" accent={NEON.violet} />
          <MovimentacaoForm itens={itens} />
        </NeonCard>
      </div>

      {movimentacoes.length > 0 && (
        <NeonCard accent={NEON.blue}>
          <PanelHeading title="Movimentações recentes" accent={NEON.blue} />
          <div className="space-y-2">
            {movimentacoes.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {m.type === "entrada" ? (
                    <PackagePlus size={13} style={{ color: NEON.green }} />
                  ) : (
                    <PackageMinus size={13} style={{ color: NEON.blue }} />
                  )}
                  <span className="text-white">{itemNameById.get(m.item_id) ?? "Item removido"}</span>
                  <span className="text-xs text-[#8b93a7]">
                    {Number(m.quantity)} un · {new Date(m.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {canSeeValues && <span className="text-xs text-[#c3c7d4]">{formatCurrency(m.total_cents / 100)}</span>}
              </div>
            ))}
          </div>
        </NeonCard>
      )}
    </div>
  );
}
