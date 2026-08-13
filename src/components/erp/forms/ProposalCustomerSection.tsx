import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { getMockCustomers } from "@/mocks/erp/customers";
import { getMockSellers } from "@/mocks/erp/sellers";

export type CustomerSectionValue = { customerName: string; sellerName: string; validUntil: string };

/** Seção "Cliente" do formulário de proposta: cliente, vendedor, validade. */
export function ProposalCustomerSection({
  value,
  onChange,
}: {
  value: CustomerSectionValue;
  onChange: (value: CustomerSectionValue) => void;
}) {
  const customers = getMockCustomers();
  const sellers = getMockSellers();

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Cliente</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="proposal-customer">Cliente</Label>
          <Select
            id="proposal-customer"
            value={value.customerName}
            onChange={(e) => onChange({ ...value, customerName: e.target.value })}
          >
            <option value="">Selecione um cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="proposal-seller">Vendedor</Label>
          <Select
            id="proposal-seller"
            value={value.sellerName}
            onChange={(e) => onChange({ ...value, sellerName: e.target.value })}
          >
            <option value="">Selecione um vendedor</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
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
