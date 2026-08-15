import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { formatDocument } from "@/components/erp/lib/format";
import type { ErpCliente } from "@/lib/actions/erp-clientes";
import type { Profile, ErpEmpresa } from "@/types/domain";

export type CustomerSectionValue = { contactId: string; sellerId: string; validUntil: string; empresaId: string };

/** Seção "Cliente" do formulário de proposta: cliente, vendedor, validade e
 * (só quando o tenant tem 2+ empresas) de qual empresa/CNPJ é a venda —
 * com 1 só, não mostra o campo, ela é usada sozinha (ver propostaCore.ts). */
export function ProposalCustomerSection({
  value,
  onChange,
  clientes,
  vendedores,
  empresas,
}: {
  value: CustomerSectionValue;
  onChange: (value: CustomerSectionValue) => void;
  clientes: ErpCliente[];
  vendedores: Profile[];
  empresas: ErpEmpresa[];
}) {
  // searchText junta nome + documento + telefone + e-mail: a busca aceita
  // qualquer um deles, com ou sem pontuação (ver SearchableSelect).
  const clienteOptions: SearchableOption[] = clientes.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: [c.cpf_cnpj ? formatDocument(c.cpf_cnpj) : null, c.phone, c.email].filter(Boolean).join(" · ") || undefined,
    searchText: [c.name, c.cpf_cnpj, c.phone, c.email].filter(Boolean).join(" "),
  }));

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Cliente</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="proposal-customer">Cliente</Label>
          <SearchableSelect
            id="proposal-customer"
            value={value.contactId}
            onChange={(contactId) => onChange({ ...value, contactId })}
            options={clienteOptions}
            placeholder="Selecione um cliente"
            searchPlaceholder="Buscar por nome, CPF/CNPJ ou telefone..."
            emptyMessage="Nenhum cliente encontrado."
          />
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
        {empresas.length > 1 && (
          <div className="sm:col-span-3">
            <Label htmlFor="proposal-empresa">Empresa</Label>
            <Select
              id="proposal-empresa"
              value={value.empresaId}
              onChange={(e) => onChange({ ...value, empresaId: e.target.value })}
            >
              <option value="">Selecione a empresa/CNPJ desta venda</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.is_matriz ? "(Matriz)" : "(Filial)"}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </Card>
  );
}
