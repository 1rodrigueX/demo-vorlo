"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { createTurno, deleteTurno, type ActionState } from "@/lib/actions/producao-config";
import type { ProducaoTurno } from "@/types/domain";

function TurnoRow({ turno }: { turno: ProducaoTurno }) {
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Excluir o turno "${turno.name}"?`)) return;
    startDelete(() => deleteTurno(turno.id));
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{turno.name}</p>
        {(turno.start_time || turno.end_time) && (
          <p className="text-xs text-gray-500">
            {turno.start_time?.slice(0, 5) ?? "?"} – {turno.end_time?.slice(0, 5) ?? "?"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
        aria-label={`Excluir ${turno.name}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function TurnosManager({ turnos }: { turnos: ProducaoTurno[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createTurno, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Turno criado");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-gray-900">Turnos</p>
      <form ref={formRef} action={formAction} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="turno-name">Nome</Label>
          <Input id="turno-name" name="name" placeholder="Ex: Manhã" required />
        </div>
        <div>
          <Label htmlFor="turno-start">Início</Label>
          <Input id="turno-start" name="startTime" type="time" />
        </div>
        <div>
          <Label htmlFor="turno-end">Fim</Label>
          <Input id="turno-end" name="endTime" type="time" />
        </div>
        <Button type="submit" isLoading={isPending}>
          <Plus size={14} />
          Adicionar
        </Button>
      </form>
      {state?.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}

      <div className="space-y-2">
        {turnos.map((t) => (
          <TurnoRow key={t.id} turno={t} />
        ))}
        {turnos.length === 0 && <p className="text-sm text-gray-500">Nenhum turno ainda.</p>}
      </div>
    </Card>
  );
}
