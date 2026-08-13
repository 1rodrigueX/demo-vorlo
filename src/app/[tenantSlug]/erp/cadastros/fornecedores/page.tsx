import { getErpFornecedores } from "@/lib/actions/erp-fornecedores";
import { FornecedoresManager } from "@/components/erp/cadastros/FornecedoresManager";

export default async function FornecedoresPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const fornecedores = await getErpFornecedores();

  return <FornecedoresManager tenantSlug={tenantSlug} initialFornecedores={fornecedores} />;
}
