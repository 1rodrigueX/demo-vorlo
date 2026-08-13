"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  createErpFuncionario,
  updateErpFuncionario,
  deleteErpFuncionario,
  type ActionState,
} from "@/lib/actions/erp-funcionarios";
import { formatShortDate } from "@/components/erp/lib/format";
import type { ErpFuncionario } from "@/types/domain";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

export function FuncionariosManager({ tenantSlug, initialFuncionarios }: { tenantSlug: string; initialFuncionarios: ErpFuncionario[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ErpFuncionario | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const action = editing ? updateErpFuncionario.bind(null, editing.id) : createErpFuncionario;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setModalOpen(false);
      toast.success(editing ? "Funcionário atualizado" : "Funcionário criado");
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(row: ErpFuncionario) {
    setEditing(row);
    setModalOpen(true);
  }
  function handleDelete(row: ErpFuncionario) {
    if (!window.confirm(`Excluir "${row.full_name}"?`)) return;
    startDelete(async () => {
      const result = await deleteErpFuncionario(row.id);
      if (result.error) toast.error(result.error);
      else toast.success("Funcionário excluído");
    });
  }

  const columns: DataTableColumn<ErpFuncionario>[] = [
    { key: "full_name", header: "Funcionário", sortable: true, sortAccessor: (r) => r.full_name, render: (r) => <span className="font-medium text-gray-900">{r.full_name}</span> },
    { key: "role", header: "Cargo", render: (r) => r.role ?? "—" },
    { key: "department", header: "Departamento", render: (r) => r.department ?? "—" },
    { key: "admission_date", header: "Admissão", render: (r) => (r.admission_date ? formatShortDate(r.admission_date) : "—") },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
  ];

  return (
    <>
      <ListPageTemplate<ErpFuncionario>
        tenantSlug={tenantSlug}
        title="Funcionários"
        description="Quadro de funcionários da empresa."
        primaryAction={{ label: "Novo funcionário", onClick: openCreate }}
        data={initialFuncionarios}
        columns={columns}
        getRowId={(r) => r.id}
        searchableFields={["full_name", "role", "department"]}
        searchPlaceholder="Buscar por nome, cargo ou departamento..."
        rowActions={(r) => (
          <div className="flex items-center justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(r)}>
              <Pencil size={14} />
            </Button>
            <Button type="button" variant="ghost" size="sm" isLoading={isDeleting} onClick={() => handleDelete(r)}>
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar funcionário" : "Novo funcionário"} className="max-w-lg">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="func-name">Nome completo</Label>
              <Input id="func-name" name="fullName" defaultValue={editing?.full_name} required />
            </div>
            <div>
              <Label htmlFor="func-role">Cargo</Label>
              <Input id="func-role" name="role" defaultValue={editing?.role ?? ""} />
            </div>
            <div>
              <Label htmlFor="func-department">Departamento</Label>
              <Input id="func-department" name="department" defaultValue={editing?.department ?? ""} />
            </div>
            <div>
              <Label htmlFor="func-admission">Admissão</Label>
              <Input id="func-admission" name="admissionDate" type="date" defaultValue={editing?.admission_date ?? ""} />
            </div>
            {editing && (
              <div>
                <Label htmlFor="func-status">Status</Label>
                <Select id="func-status" name="status" defaultValue={editing.status}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Select>
              </div>
            )}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" isLoading={isPending} className="w-full">
            {editing ? "Salvar" : "Criar funcionário"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
