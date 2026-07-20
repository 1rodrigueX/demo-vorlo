"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { registrarApontamentoAction, type ActionState } from "@/lib/actions/producao-apontamento";
import type { ProducaoProduto, ProducaoTurno, ProducaoMaquina, ProducaoEstilo } from "@/types/domain";

export function ApontamentoForm({
  produtos,
  turnos,
  maquinas,
  estilos,
  defaultTurnoId,
  defaultMaquinaId,
}: {
  produtos: ProducaoProduto[];
  turnos: ProducaoTurno[];
  maquinas: ProducaoMaquina[];
  estilos: ProducaoEstilo[];
  defaultTurnoId: string | null;
  defaultMaquinaId: string | null;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(registrarApontamentoAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      toast.success("Produção registrada");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  if (produtos.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-500">Nenhum produto cadastrado ainda — peça pro dono configurar em Produção.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-gray-900">Registrar produção</p>
      <form ref={formRef} action={formAction} className="space-y-3">
        <div>
          <Label htmlFor="ap-produto">Produto</Label>
          <Select id="ap-produto" name="produtoId" required defaultValue="">
            <option value="" disabled>
              Escolha o produto...
            </option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="ap-turno">Turno</Label>
            <Select id="ap-turno" name="turnoId" defaultValue={defaultTurnoId ?? ""}>
              <option value="">—</option>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ap-maquina">Máquina</Label>
            <Select id="ap-maquina" name="maquinaId" defaultValue={defaultMaquinaId ?? ""}>
              <option value="">—</option>
              {maquinas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ap-estilo">Estilo</Label>
            <Select id="ap-estilo" name="estiloId" defaultValue="">
              <option value="">—</option>
              {estilos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ap-quantity">Quantidade produzida</Label>
            <Input id="ap-quantity" name="quantity" type="number" min="0" step="0.001" defaultValue="0" />
          </div>
          <div>
            <Label htmlFor="ap-perdas">Perdas</Label>
            <Input id="ap-perdas" name="perdas" type="number" min="0" step="0.001" defaultValue="0" />
          </div>
        </div>

        <div>
          <Label htmlFor="ap-note">Observação (opcional)</Label>
          <Input id="ap-note" name="note" placeholder="Ex: lote 42" />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" isLoading={isPending} className="w-full">
          <Send size={14} />
          Registrar
        </Button>
      </form>
    </Card>
  );
}
