"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { createLancamento, type ActionState } from "@/lib/actions/financas";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/financas/categories";

export function NovoLancamentoModal({
  open,
  onClose,
  context,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  context: "pessoal" | "empresarial";
  onSaved: () => void;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createLancamento, null);
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      setType("despesa");
      onSaved();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSaved]);

  const categories = type === "despesa" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal open={open} onClose={onClose} title="Novo lançamento">
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="context" value={context} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("despesa")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "despesa"
                ? "border-red-400 bg-red-50 text-red-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setType("receita")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "receita"
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Receita
          </button>
        </div>
        <input type="hidden" name="type" value={type} />

        <div>
          <Label htmlFor="lanc-category">Categoria</Label>
          <Select id="lanc-category" name="category" required>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="lanc-description">Descrição (opcional)</Label>
          <Input id="lanc-description" name="description" placeholder="Ex: Cinema, Salário de julho..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lanc-amount">Valor (R$)</Label>
            <Input id="lanc-amount" name="amountReais" type="number" min="0.01" step="0.01" required />
          </div>
          <div>
            <Label htmlFor="lanc-date">Data</Label>
            <Input id="lanc-date" name="entryDate" type="date" defaultValue={today} required />
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" className="w-full" isLoading={isPending}>
          Salvar lançamento
        </Button>
      </form>
    </Modal>
  );
}
