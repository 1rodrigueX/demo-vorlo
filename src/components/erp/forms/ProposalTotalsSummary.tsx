import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { formatCurrency } from "@/lib/utils/currency";

/** Seção "Totais": subtotal (calculado), desconto/frete (editáveis) e total. */
export function ProposalTotalsSummary({
  subtotal,
  discount,
  freight,
  onDiscountChange,
  onFreightChange,
}: {
  subtotal: number;
  discount: number;
  freight: number;
  onDiscountChange: (value: number) => void;
  onFreightChange: (value: number) => void;
}) {
  const total = subtotal + freight - discount;

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Totais</h2>
      <div className="ml-auto max-w-xs space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-800">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <Label htmlFor="proposal-discount" className="text-gray-500">
            Desconto (R$)
          </Label>
          <input
            id="proposal-discount"
            type="number"
            min={0}
            step={0.01}
            value={discount}
            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
            className="w-28 rounded-md border border-gray-300 bg-panel px-2 py-1 text-right text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <Label htmlFor="proposal-freight" className="text-gray-500">
            Frete (R$)
          </Label>
          <input
            id="proposal-freight"
            type="number"
            min={0}
            step={0.01}
            value={freight}
            onChange={(e) => onFreightChange(Number(e.target.value) || 0)}
            className="w-28 rounded-md border border-gray-300 bg-panel px-2 py-1 text-right text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  );
}
