import { cookies } from "next/headers";
import { getErpClientes } from "@/lib/actions/erp-clientes";
import { getErpProfiles } from "@/lib/actions/erp-pessoas";
import { getErpProdutos } from "@/lib/actions/erp-produtos";
import { getErpFornecedores } from "@/lib/actions/erp-fornecedores";
import { getErpEmpresas } from "@/lib/actions/erp-empresas";
import { NovaPropostaForm } from "@/components/erp/vendas/NovaPropostaForm";
import { CURRENT_EMPRESA_COOKIE } from "@/lib/erp/empresaCookie";

export default async function NovaPropostaPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const [clientes, vendedores, produtos, fornecedores, empresas] = await Promise.all([
    getErpClientes(),
    getErpProfiles(),
    getErpProdutos(),
    getErpFornecedores(),
    getErpEmpresas(),
  ]);

  const cookieEmpresaId = (await cookies()).get(CURRENT_EMPRESA_COOKIE)?.value ?? "";
  const defaultEmpresaId = empresas.some((e) => e.id === cookieEmpresaId)
    ? cookieEmpresaId
    : (empresas.length === 1 ? empresas[0].id : "");

  return (
    <NovaPropostaForm
      tenantSlug={tenantSlug}
      clientes={clientes}
      vendedores={vendedores}
      produtos={produtos}
      fornecedores={fornecedores}
      empresas={empresas}
      defaultEmpresaId={defaultEmpresaId}
    />
  );
}
