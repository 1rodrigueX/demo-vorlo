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
import { createErpProduto, updateErpProduto, deleteErpProduto, type ActionState } from "@/lib/actions/erp-produtos";
import { formatCurrency } from "@/lib/utils/currency";
import type { ErpProduto, ErpCategoria } from "@/types/domain";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

type ProdutoRow = ErpProduto & { category: ErpCategoria | null };

export function ProdutosManager({
  tenantSlug,
  initialProdutos,
  categorias,
}: {
  tenantSlug: string;
  initialProdutos: ProdutoRow[];
  categorias: ErpCategoria[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const action = editing ? updateErpProduto.bind(null, editing.id) : createErpProduto;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      setModalOpen(false);
      toast.success(editing ? "Produto atualizado" : "Produto criado");
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(row: ProdutoRow) {
    setEditing(row);
    setModalOpen(true);
  }
  function handleDelete(row: ProdutoRow) {
    if (!window.confirm(`Excluir o produto "${row.name}"?`)) return;
    startDelete(async () => {
      const result = await deleteErpProduto(row.id);
      if (result.error) toast.error(result.error);
      else toast.success("Produto excluído");
    });
  }

  const columns: DataTableColumn<ProdutoRow>[] = [
    {
      key: "name",
      header: "Produto",
      sortable: true,
      sortAccessor: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.name}</p>
          <p className="text-xs text-gray-400">{r.sku ?? "—"}</p>
        </div>
      ),
    },
    { key: "category", header: "Categoria", render: (r) => r.category?.name ?? <span className="text-gray-400">—</span> },
    { key: "unit", header: "Unid.", align: "center" },
    {
      key: "sale_price_cents",
      header: "Preço de venda",
      align: "right",
      sortable: true,
      sortAccessor: (r) => r.sale_price_cents,
      render: (r) => formatCurrency(r.sale_price_cents / 100),
    },
    {
      key: "quantity",
      header: "Estoque",
      align: "right",
      sortable: true,
      sortAccessor: (r) => r.quantity,
      render: (r) => (
        <span className={r.quantity <= 0 ? "font-semibold text-red-600" : r.quantity < r.min_stock ? "font-semibold text-amber-600" : "text-gray-700"}>
          {r.quantity}
        </span>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<ProdutoRow>
        tenantSlug={tenantSlug}
        title="Produtos"
        description="Cadastro de produtos, preços e controle de estoque mínimo."
        primaryAction={{ label: "Novo produto", onClick: openCreate }}
        data={initialProdutos}
        columns={columns}
        getRowId={(r) => r.id}
        searchableFields={["name", "sku"]}
        searchPlaceholder="Buscar por nome ou SKU..."
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar produto" : "Novo produto"} className="max-w-lg">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="prod-name">Nome</Label>
              <Input id="prod-name" name="name" defaultValue={editing?.name} required />
            </div>
            <div>
              <Label htmlFor="prod-sku">SKU</Label>
              <Input id="prod-sku" name="sku" defaultValue={editing?.sku ?? ""} />
            </div>
            <div>
              <Label htmlFor="prod-unit">Unidade</Label>
              <Input id="prod-unit" name="unit" defaultValue={editing?.unit ?? "un"} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="prod-category">Categoria</Label>
              <Select id="prod-category" name="categoryId" defaultValue={editing?.category_id ?? ""}>
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="prod-cost">Preço de custo (R$)</Label>
              <Input
                id="prod-cost"
                name="costPriceReais"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing ? (editing.cost_price_cents / 100).toFixed(2) : undefined}
              />
            </div>
            <div>
              <Label htmlFor="prod-sale">Preço de venda (R$)</Label>
              <Input
                id="prod-sale"
                name="salePriceReais"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing ? (editing.sale_price_cents / 100).toFixed(2) : undefined}
              />
            </div>
            <div>
              <Label htmlFor="prod-qty">Estoque atual</Label>
              <Input id="prod-qty" name="quantity" type="number" step="0.001" min="0" defaultValue={editing?.quantity} />
            </div>
            <div>
              <Label htmlFor="prod-min">Estoque mínimo</Label>
              <Input id="prod-min" name="minStock" type="number" step="0.001" min="0" defaultValue={editing?.min_stock} />
            </div>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" isLoading={isPending} className="w-full">
            {editing ? "Salvar" : "Criar produto"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
