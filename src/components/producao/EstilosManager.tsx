"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { createEstilo, deleteEstilo, type ActionState } from "@/lib/actions/producao-config";
import type { ProducaoEstilo } from "@/types/domain";

function EstiloRow({ estilo }: { estilo: ProducaoEstilo }) {
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Excluir o estilo "${estilo.name}"?`)) return;
    startDelete(() => deleteEstilo(estilo.id));
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{estilo.name}</p>
        {estilo.description && <p className="text-xs text-gray-500">{estilo.description}</p>}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
        aria-label={`Excluir ${estilo.name}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function EstilosManager({ estilos }: { estilos: ProducaoEstilo[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createEstilo, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Estilo criado");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-gray-900">Estilos de produção</p>
      <form ref={formRef} action={formAction} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="estilo-name">Nome</Label>
          <Input id="estilo-name" name="name" placeholder="Ex: Injeção plástica" required />
        </div>
        <div className="min-w-[180px] flex-1">
          <Label htmlFor="estilo-desc">Descrição (opcional)</Label>
          <Input id="estilo-desc" name="description" placeholder="Ex: Molde a quente" />
        </div>
        <Button type="submit" isLoading={isPending}>
          <Plus size={14} />
          Adicionar
        </Button>
      </form>
      {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}

      <div className="space-y-2">
        {estilos.map((e) => (
          <EstiloRow key={e.id} estilo={e} />
        ))}
        {estilos.length === 0 && <p className="text-sm text-gray-500">Nenhum estilo ainda.</p>}
      </div>
    </Card>
  );
}
