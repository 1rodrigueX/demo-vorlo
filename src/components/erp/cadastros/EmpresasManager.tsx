"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Building2 } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { createErpEmpresa, updateErpEmpresa, deleteErpEmpresa, type ActionState } from "@/lib/actions/erp-empresas";
import { formatDocument } from "@/components/erp/lib/format";
import type { ErpEmpresa } from "@/types/domain";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const REGIME_LABEL: Record<ErpEmpresa["regime_tributario"], string> = {
  simples: "Simples Nacional",
  presumido: "Lucro Presumido",
  real: "Lucro Real",
};

export function EmpresasManager({
  tenantSlug,
  initialEmpresas,
  limit,
}: {
  tenantSlug: string;
  initialEmpresas: ErpEmpresa[];
  limit: { used: number; allowed: number };
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ErpEmpresa | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const action = editing ? updateErpEmpresa.bind(null, editing.id) : createErpEmpresa;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setModalOpen(false);
      toast.success(editing ? "Empresa atualizada" : "Empresa criada");
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  const atLimit = limit.used >= limit.allowed;

  function openCreate() {
    if (atLimit) {
      toast.error("Você já tem o máximo de empresas do seu plano — peça uma a mais no Suporte (chat do Vorlo).");
      return;
    }
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(row: ErpEmpresa) {
    setEditing(row);
    setModalOpen(true);
  }
  function handleDelete(row: ErpEmpresa) {
    if (!window.confirm(`Excluir a empresa "${row.name}"?`)) return;
    startDelete(async () => {
      const result = await deleteErpEmpresa(row.id);
      if (result.error) toast.error(result.error);
      else toast.success("Empresa excluída");
    });
  }

  const columns: DataTableColumn<ErpEmpresa>[] = [
    {
      key: "name",
      header: "Empresa",
      sortable: true,
      sortAccessor: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.is_matriz && <Building2 size={14} className="shrink-0 text-[#ff5722]" />}
          <div>
            <p className="font-medium text-gray-900">{r.name}</p>
            <p className="text-xs text-gray-400">{formatDocument(r.cnpj)}</p>
          </div>
        </div>
      ),
    },
    { key: "regime", header: "Regime tributário", render: (r) => REGIME_LABEL[r.regime_tributario] },
    { key: "city", header: "Cidade", render: (r) => (r.city ? `${r.city}/${r.state ?? ""}` : "—") },
    { key: "tipo", header: "Tipo", render: (r) => (r.is_matriz ? "Matriz" : "Filial") },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
  ];

  return (
    <>
      <ListPageTemplate<ErpEmpresa>
        tenantSlug={tenantSlug}
        title="Empresas"
        description={`Matriz e filiais do seu CRM+ERP. ${limit.used}/${limit.allowed} empresa(s) usadas do seu plano.`}
        primaryAction={{ label: "Nova empresa", onClick: openCreate }}
        data={initialEmpresas}
        columns={columns}
        getRowId={(r) => r.id}
        searchableFields={["name", "cnpj", "city"]}
        searchPlaceholder="Buscar por nome, CNPJ ou cidade..."
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

      {atLimit && !editing && (
        <p className="mt-2 text-xs text-gray-500">
          Precisa de mais uma empresa/filial em outro CNPJ? Peça no Suporte (chat do Vorlo) — ele libera a vaga na hora.
        </p>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar empresa" : "Nova empresa"} className="max-w-lg">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="emp-name">Razão social</Label>
              <Input id="emp-name" name="name" defaultValue={editing?.name} required />
            </div>
            <div>
              <Label htmlFor="emp-cnpj">CNPJ</Label>
              <Input id="emp-cnpj" name="cnpj" defaultValue={editing?.cnpj ?? ""} placeholder="00.000.000/0001-00" required />
            </div>
            <div>
              <Label htmlFor="emp-regime">Regime tributário</Label>
              <Select id="emp-regime" name="regimeTributario" defaultValue={editing?.regime_tributario ?? "simples"}>
                <option value="simples">Simples Nacional</option>
                <option value="presumido">Lucro Presumido</option>
                <option value="real">Lucro Real</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="emp-city">Cidade</Label>
              <Input id="emp-city" name="city" defaultValue={editing?.city ?? ""} />
            </div>
            <div>
              <Label htmlFor="emp-state">UF</Label>
              <Input id="emp-state" name="state" maxLength={2} defaultValue={editing?.state ?? ""} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="emp-matriz"
                name="isMatriz"
                type="checkbox"
                defaultChecked={editing?.is_matriz ?? initialEmpresas.length === 0}
                className="rounded border-gray-300"
              />
              <Label htmlFor="emp-matriz" className="mb-0">
                É a matriz
              </Label>
            </div>
            {editing && (
              <div className="sm:col-span-2">
                <Label htmlFor="emp-status">Status</Label>
                <Select id="emp-status" name="status" defaultValue={editing.status}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Select>
              </div>
            )}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" isLoading={isPending} className="w-full">
            {editing ? "Salvar" : "Criar empresa"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
