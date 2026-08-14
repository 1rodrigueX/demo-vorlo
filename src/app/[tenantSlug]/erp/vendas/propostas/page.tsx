import { getErpPropostas } from "@/lib/actions/erp-propostas";
import { PropostasTable } from "@/components/erp/vendas/PropostasTable";

export default async function PropostasPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const propostas = await getErpPropostas();

  return <PropostasTable tenantSlug={tenantSlug} initialPropostas={propostas} />;
}
