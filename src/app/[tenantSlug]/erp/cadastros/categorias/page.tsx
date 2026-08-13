import { getErpCategorias } from "@/lib/actions/erp-categorias";
import { CategoriasManager } from "@/components/erp/cadastros/CategoriasManager";

export default async function CategoriasPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const categorias = await getErpCategorias();

  return <CategoriasManager tenantSlug={tenantSlug} initialCategorias={categorias} />;
}
