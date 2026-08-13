import { getErpFuncionarios } from "@/lib/actions/erp-funcionarios";
import { FuncionariosManager } from "@/components/erp/cadastros/FuncionariosManager";

export default async function FuncionariosPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const funcionarios = await getErpFuncionarios();

  return <FuncionariosManager tenantSlug={tenantSlug} initialFuncionarios={funcionarios} />;
}
