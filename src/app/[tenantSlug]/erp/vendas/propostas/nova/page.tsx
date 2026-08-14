import { getErpClientes } from "@/lib/actions/erp-clientes";
import { getErpProfiles } from "@/lib/actions/erp-pessoas";
import { getErpProdutos } from "@/lib/actions/erp-produtos";
import { getErpFornecedores } from "@/lib/actions/erp-fornecedores";
import { NovaPropostaForm } from "@/components/erp/vendas/NovaPropostaForm";

export default async function NovaPropostaPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const [clientes, vendedores, produtos, fornecedores] = await Promise.all([
    getErpClientes(),
    getErpProfiles(),
    getErpProdutos(),
    getErpFornecedores(),
  ]);

  return (
    <NovaPropostaForm
      tenantSlug={tenantSlug}
      clientes={clientes}
      vendedores={vendedores}
      produtos={produtos}
      fornecedores={fornecedores}
    />
  );
}
