"use client";

import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getMockProducts } from "@/mocks/erp/products";
import { formatCurrency } from "@/lib/utils/currency";

export type DraftItem = {
  key: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
};

export function itemSubtotal(item: DraftItem): number {
  return item.quantity * item.unitPrice * (1 - item.discountPct / 100);
}

let rowSeq = 0;
export function newDraftItem(): DraftItem {
  rowSeq += 1;
  return { key: `row-${Date.now()}-${rowSeq}`, productName: "", quantity: 1, unitPrice: 0, discountPct: 0 };
}

/** Seção "Produtos" — tabela editável de itens da proposta (add/remove linha, subtotal calculado no cliente). */
export function ProposalItemsTable({ items, onChange }: { items: DraftItem[]; onChange: (items: DraftItem[]) => void }) {
  const products = getMockProducts();

  function updateItem(key: string, patch: Partial<DraftItem>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handleProductChange(key: string, productName: string) {
    const product = products.find((p) => p.name === productName);
    updateItem(key, { productName, unitPrice: product?.salePrice ?? 0 });
  }

  function removeItem(key: string) {
    onChange(items.filter((item) => item.key !== key));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Produtos</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...items, newDraftItem()])}>
          <Plus size={14} />
          Adicionar item
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-2">Produto</th>
              <th className="w-24 px-2 py-2 text-right">Qtd.</th>
              <th className="w-32 px-2 py-2 text-right">Preço</th>
              <th className="w-24 px-2 py-2 text-right">Desc. %</th>
              <th className="w-32 px-2 py-2 text-right">Subtotal</th>
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-2">
                  <select
                    value={item.productName}
                    onChange={(e) => handleProductChange(item.key, e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-panel px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione um produto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) || 0 })}
                    className="w-full rounded-md border border-gray-300 bg-panel px-2 py-1.5 text-right text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) || 0 })}
                    className="w-full rounded-md border border-gray-300 bg-panel px-2 py-1.5 text-right text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={item.discountPct}
                    onChange={(e) => updateItem(item.key, { discountPct: Number(e.target.value) || 0 })}
                    className="w-full rounded-md border border-gray-300 bg-panel px-2 py-1.5 text-right text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-2 py-2 text-right font-medium text-gray-800">{formatCurrency(itemSubtotal(item))}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    aria-label="Remover item"
                    className="text-gray-300 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Nenhum item adicionado ainda.</p>}
      </div>
    </Card>
  );
}
