import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import type { ErpCliente } from "@/lib/actions/erp-clientes";
import type { Profile } from "@/types/domain";

export type CustomerSectionValue = { contactId: string; sellerId: string; validUntil: string };

/** Seção "Cliente" do formulário de proposta: cliente, vendedor, validade. */
export function ProposalCustomerSection({
  value,
  onChange,
  clientes,
  vendedores,
}: {
  value: CustomerSectionValue;
  onChange: (value: CustomerSectionValue) => void;
  clientes: ErpCliente[];
  vendedores: Profile[];
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Cliente</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="proposal-customer">Cliente</Label>
          <Select
            id="proposal-customer"
            value={value.contactId}
            onChange={(e) => onChange({ ...value, contactId: e.target.value })}
          >
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="proposal-seller">Vendedor</Label>
          <Select
            id="proposal-seller"
            value={value.sellerId}
            onChange={(e) => onChange({ ...value, sellerId: e.target.value })}
          >
            <option value="">Selecione um vendedor</option>
            {vendedores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "—"}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="proposal-valid-until">Validade</Label>
          <Input
            id="proposal-valid-until"
            type="date"
            value={value.validUntil}
            onChange={(e) => onChange({ ...value, validUntil: e.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
