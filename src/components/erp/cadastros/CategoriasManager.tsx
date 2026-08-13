"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  createErpCategoria,
  updateErpCategoria,
  deleteErpCategoria,
  type ActionState,
} from "@/lib/actions/erp-categorias";
import type { ErpCategoria } from "@/types/domain";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

export function CategoriasManager({ tenantSlug, initialCategorias }: { tenantSlug: string; initialCategorias: ErpCategoria[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ErpCategoria | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const action = editing ? updateErpCategoria.bind(null, editing.id) : createErpCategoria;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setModalOpen(false);
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(row: ErpCategoria) {
    setEditing(row);
    setModalOpen(true);
  }
  function handleDelete(row: ErpCategoria) {
    if (!window.confirm(`Excluir a categoria "${row.name}"?`)) return;
    startDelete(() => deleteErpCategoria(row.id));
  }

  const nameOf = (id: string | null) => initialCategorias.find((c) => c.id === id)?.name ?? null;

  const columns: DataTableColumn<ErpCategoria>[] = [
    { key: "name", header: "Categoria", sortable: true, sortAccessor: (r) => r.name, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: "parent_id", header: "Categoria pai", render: (r) => nameOf(r.parent_id) ?? <span className="text-gray-400">—</span> },
  ];

  return (
    <>
      <ListPageTemplate<ErpCategoria>
        tenantSlug={tenantSlug}
        title="Categorias"
        description="Organização das categorias de produtos."
        primaryAction={{ label: "Nova categoria", onClick: openCreate }}
        data={initialCategorias}
        columns={columns}
        getRowId={(r) => r.id}
        searchableFields={["name"]}
        searchPlaceholder="Buscar categoria..."
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar categoria" : "Nova categoria"}>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" name="name" defaultValue={editing?.name} required />
          </div>
          <div>
            <Label htmlFor="cat-parent">Categoria pai (opcional)</Label>
            <Select id="cat-parent" name="parentId" defaultValue={editing?.parent_id ?? ""}>
              <option value="">Nenhuma</option>
              {initialCategorias
                .filter((c) => c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" isLoading={isPending} className="w-full">
            {editing ? "Salvar" : "Criar categoria"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
