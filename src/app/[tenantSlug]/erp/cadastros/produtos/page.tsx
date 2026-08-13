import { getErpProdutos } from "@/lib/actions/erp-produtos";
import { getErpCategorias } from "@/lib/actions/erp-categorias";
import { ProdutosManager } from "@/components/erp/cadastros/ProdutosManager";

export default async function ProdutosPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const [produtos, categorias] = await Promise.all([getErpProdutos(), getErpCategorias()]);

  return <ProdutosManager tenantSlug={tenantSlug} initialProdutos={produtos} categorias={categorias} />;
}
