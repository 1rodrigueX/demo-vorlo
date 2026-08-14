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
  createErpFornecedor,
  updateErpFornecedor,
  deleteErpFornecedor,
  type ActionState,
} from "@/lib/actions/erp-fornecedores";
import { formatDocument } from "@/components/erp/lib/format";
import type { ErpFornecedor } from "@/types/domain";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

export function FornecedoresManager({ tenantSlug, initialFornecedores }: { tenantSlug: string; initialFornecedores: ErpFornecedor[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ErpFornecedor | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const action = editing ? updateErpFornecedor.bind(null, editing.id) : createErpFornecedor;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setModalOpen(false);
      toast.success(editing ? "Fornecedor atualizado" : "Fornecedor criado");
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(row: ErpFornecedor) {
    setEditing(row);
    setModalOpen(true);
  }
  function handleDelete(row: ErpFornecedor) {
    if (!window.confirm(`Excluir o fornecedor "${row.name}"?`)) return;
    startDelete(async () => {
      const result = await deleteErpFornecedor(row.id);
      if (result.error) toast.error(result.error);
      else toast.success("Fornecedor excluído");
    });
  }

  const columns: DataTableColumn<ErpFornecedor>[] = [
    {
      key: "name",
      header: "Fornecedor",
      sortable: true,
      sortAccessor: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.name}</p>
          <p className="text-xs text-gray-400">{r.document ? formatDocument(r.document) : "—"}</p>
        </div>
      ),
    },
    { key: "category", header: "Categoria", render: (r) => r.category ?? "—" },
    { key: "city", header: "Cidade", render: (r) => (r.city ? `${r.city}/${r.state ?? ""}` : "—") },
    { key: "email", header: "E-mail", render: (r) => r.email ?? "—" },
    { key: "phone", header: "Telefone", render: (r) => r.phone ?? "—" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
  ];

  return (
    <>
      <ListPageTemplate<ErpFornecedor>
        tenantSlug={tenantSlug}
        title="Fornecedores"
        description="Cadastro de fornecedores de matéria-prima, insumos e serviços."
        primaryAction={{ label: "Novo fornecedor", onClick: openCreate }}
        data={initialFornecedores}
        columns={columns}
        getRowId={(r) => r.id}
        searchableFields={["name", "document", "email", "city", "category"]}
        searchPlaceholder="Buscar por nome, documento, e-mail ou categoria..."
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar fornecedor" : "Novo fornecedor"} className="max-w-lg">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="forn-name">Nome</Label>
              <Input id="forn-name" name="name" defaultValue={editing?.name} required />
            </div>
            <div>
              <Label htmlFor="forn-document">CPF/CNPJ</Label>
              <Input id="forn-document" name="document" defaultValue={editing?.document ?? ""} />
            </div>
            <div>
              <Label htmlFor="forn-category">Categoria</Label>
              <Input id="forn-category" name="category" defaultValue={editing?.category ?? ""} placeholder="Ex.: Matéria-prima, Logística" />
            </div>
            <div>
              <Label htmlFor="forn-email">E-mail</Label>
              <Input id="forn-email" name="email" type="email" defaultValue={editing?.email ?? ""} />
            </div>
            <div>
              <Label htmlFor="forn-phone">Telefone</Label>
              <Input id="forn-phone" name="phone" defaultValue={editing?.phone ?? ""} />
            </div>
            <div>
              <Label htmlFor="forn-city">Cidade</Label>
              <Input id="forn-city" name="city" defaultValue={editing?.city ?? ""} />
            </div>
            <div>
              <Label htmlFor="forn-state">UF</Label>
              <Input id="forn-state" name="state" maxLength={2} defaultValue={editing?.state ?? ""} />
            </div>
            {editing && (
              <div className="sm:col-span-2">
                <Label htmlFor="forn-status">Status</Label>
                <Select id="forn-status" name="status" defaultValue={editing.status}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Select>
              </div>
            )}
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" isLoading={isPending} className="w-full">
            {editing ? "Salvar" : "Criar fornecedor"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
