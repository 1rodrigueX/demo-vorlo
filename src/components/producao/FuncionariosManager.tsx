"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  createFuncionario,
  deleteFuncionario,
  updateFuncionarioAssignment,
  type ActionState,
} from "@/lib/actions/producao-funcionarios";
import type { ProducaoFuncionario, ProducaoTurno, ProducaoMaquina } from "@/types/domain";

function FuncionarioRow({
  funcionario,
  turnos,
  maquinas,
}: {
  funcionario: ProducaoFuncionario;
  turnos: ProducaoTurno[];
  maquinas: ProducaoMaquina[];
}) {
  const [isDeleting, startDelete] = useTransition();
  const [isUpdating, startUpdate] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Excluir o acesso de "${funcionario.full_name}"? A conta de login é apagada.`)) return;
    startDelete(() => deleteFuncionario(funcionario.id));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
      <p className="text-sm font-medium text-gray-900">{funcionario.full_name}</p>
      <div className="flex items-center gap-2">
        <select
          value={funcionario.turno_id ?? ""}
          disabled={isUpdating}
          onChange={(e) =>
            startUpdate(async () => {
              await updateFuncionarioAssignment(funcionario.id, e.target.value || null, funcionario.maquina_id);
            })
          }
          className="rounded-md border border-gray-300 bg-panel px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Sem turno</option>
          {turnos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={funcionario.maquina_id ?? ""}
          disabled={isUpdating}
          onChange={(e) =>
            startUpdate(async () => {
              await updateFuncionarioAssignment(funcionario.id, funcionario.turno_id, e.target.value || null);
            })
          }
          className="rounded-md border border-gray-300 bg-panel px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Sem máquina</option>
          {maquinas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
          aria-label={`Excluir ${funcionario.full_name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function FuncionariosManager({
  funcionarios,
  turnos,
  maquinas,
}: {
  funcionarios: ProducaoFuncionario[];
  turnos: ProducaoTurno[];
  maquinas: ProducaoMaquina[];
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createFuncionario, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Funcionário criado");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-gray-900">Funcionários</p>
      <form ref={formRef} action={formAction} className="mb-4 space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="func-name">Nome completo</Label>
            <Input id="func-name" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="func-email">Email</Label>
            <Input id="func-email" name="email" type="email" required />
          </div>
        </div>
        <div>
          <Label htmlFor="func-password">Senha inicial</Label>
          <PasswordInput id="func-password" name="password" minLength={8} required />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="func-turno">Turno (opcional)</Label>
            <Select id="func-turno" name="turnoId" defaultValue="">
              <option value="">Sem turno</option>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="func-maquina">Máquina (opcional)</Label>
            <Select id="func-maquina" name="maquinaId" defaultValue="">
              <option value="">Sem máquina</option>
              {maquinas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" isLoading={isPending} className="w-full">
          <Plus size={14} />
          Criar acesso de funcionário
        </Button>
      </form>

      <div className="space-y-2">
        {funcionarios.map((f) => (
          <FuncionarioRow key={f.id} funcionario={f} turnos={turnos} maquinas={maquinas} />
        ))}
        {funcionarios.length === 0 && <p className="text-sm text-gray-500">Nenhum funcionário ainda.</p>}
      </div>
    </Card>
  );
}
