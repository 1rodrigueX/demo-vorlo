import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { ErpFornecedor } from "@/types/domain";

export type TermsSectionValue = { paymentTerm: string; freightType: "CIF" | "FOB"; carrierId: string };

const PAYMENT_TERMS = ["À vista", "30 dias", "30/60 dias", "30/60/90 dias", "45 dias", "60 dias"];

/** Seção "Condições comerciais": forma de pagamento, frete e transportadora. */
export function ProposalTermsSection({
  value,
  onChange,
  fornecedores,
}: {
  value: TermsSectionValue;
  onChange: (value: TermsSectionValue) => void;
  fornecedores: ErpFornecedor[];
}) {
  const carriers = fornecedores.filter((s) => s.category === "Logística");

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Condições comerciais</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="proposal-payment-term">Forma de pagamento / prazo</Label>
          <Select
            id="proposal-payment-term"
            value={value.paymentTerm}
            onChange={(e) => onChange({ ...value, paymentTerm: e.target.value })}
          >
            <option value="">Selecione</option>
            {PAYMENT_TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="proposal-freight-type">Frete</Label>
          <Select
            id="proposal-freight-type"
            value={value.freightType}
            onChange={(e) => onChange({ ...value, freightType: e.target.value as "CIF" | "FOB" })}
          >
            <option value="CIF">CIF (por conta do vendedor)</option>
            <option value="FOB">FOB (por conta do comprador)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="proposal-carrier">Transportadora</Label>
          <Select
            id="proposal-carrier"
            value={value.carrierId}
            onChange={(e) => onChange({ ...value, carrierId: e.target.value })}
          >
            <option value="">Nenhuma</option>
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Card>
  );
}
