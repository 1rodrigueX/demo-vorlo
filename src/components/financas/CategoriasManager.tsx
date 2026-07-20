"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createCategoria, deleteCategoria, type ActionState } from "@/lib/actions/financas-categorias";
import type { FinancasCategoria } from "@/types/domain";

function CategoriaForm({ type }: { type: "despesa" | "receita" }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createCategoria, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Categoria criada");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="type" value={type} />
      <input
        name="name"
        placeholder="Nova categoria..."
        required
        className="flex-1 rounded-md border border-[#383835] bg-[#0d0d0d] px-3 py-1.5 text-sm text-white placeholder:text-[#898781] focus:outline-none focus:ring-1 focus:ring-[#3987e5]"
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1 rounded-md bg-[#3987e5] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={14} />
        Adicionar
      </button>
      {state?.error && <p className="ml-2 text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

function CategoriaRow({ categoria }: { categoria: FinancasCategoria }) {
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Excluir "${categoria.name}"? Lançamentos antigos com essa categoria não são apagados.`)) {
      return;
    }
    startDelete(() => deleteCategoria(categoria.id));
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2c2c2a] bg-[#1a1a19] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoria.color }} />
        <span className="text-sm text-white">{categoria.name}</span>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-[#898781] transition-colors hover:text-red-400 disabled:opacity-50"
        aria-label={`Excluir ${categoria.name}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function CategoriasManager({ categorias }: { categorias: FinancasCategoria[] }) {
  const despesas = categorias.filter((c) => c.type === "despesa");
  const receitas = categorias.filter((c) => c.type === "receita");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[#c3c2b7]">Categorias de despesa</h2>
        <CategoriaForm type="despesa" />
        <div className="space-y-2">
          {despesas.map((c) => (
            <CategoriaRow key={c.id} categoria={c} />
          ))}
          {despesas.length === 0 && <p className="text-sm text-[#898781]">Nenhuma categoria ainda.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[#c3c2b7]">Categorias de receita</h2>
        <CategoriaForm type="receita" />
        <div className="space-y-2">
          {receitas.map((c) => (
            <CategoriaRow key={c.id} categoria={c} />
          ))}
          {receitas.length === 0 && <p className="text-sm text-[#898781]">Nenhuma categoria ainda.</p>}
        </div>
      </div>
    </div>
  );
}
