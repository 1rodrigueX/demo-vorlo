"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { createMaquina, deleteMaquina, updateMaquinaStatus, type ActionState } from "@/lib/actions/producao-config";
import type { ProducaoMaquina } from "@/types/domain";

const STATUS_LABEL: Record<ProducaoMaquina["status"], string> = {
  ativa: "Ativa",
  manutencao: "Manutenção",
  parada: "Parada",
};

function MaquinaRow({ maquina }: { maquina: ProducaoMaquina }) {
  const [isDeleting, startDelete] = useTransition();
  const [isUpdating, startUpdate] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Excluir a máquina "${maquina.name}"?`)) return;
    startDelete(() => deleteMaquina(maquina.id));
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
      <p className="text-sm font-medium text-gray-900">{maquina.name}</p>
      <div className="flex items-center gap-2">
        <select
          value={maquina.status}
          disabled={isUpdating}
          onChange={(e) =>
            startUpdate(() => updateMaquinaStatus(maquina.id, e.target.value as ProducaoMaquina["status"]))
          }
          className="rounded-md border border-gray-300 bg-panel px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
          aria-label={`Excluir ${maquina.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function MaquinasManager({ maquinas }: { maquinas: ProducaoMaquina[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createMaquina, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Máquina criada");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-gray-900">Máquinas</p>
      <form ref={formRef} action={formAction} className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="maquina-name">Nome</Label>
          <Input id="maquina-name" name="name" placeholder="Ex: Injetora 01" required />
        </div>
        <Button type="submit" isLoading={isPending}>
          <Plus size={14} />
          Adicionar
        </Button>
      </form>
      {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}

      <div className="space-y-2">
        {maquinas.map((m) => (
          <MaquinaRow key={m.id} maquina={m} />
        ))}
        {maquinas.length === 0 && <p className="text-sm text-gray-500">Nenhuma máquina ainda.</p>}
      </div>
    </Card>
  );
}
