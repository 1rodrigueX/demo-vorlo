import { getErpEmpresas, getErpEmpresaLimit } from "@/lib/actions/erp-empresas";
import { EmpresasManager } from "@/components/erp/cadastros/EmpresasManager";

export default async function EmpresasPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const [empresas, limit] = await Promise.all([getErpEmpresas(), getErpEmpresaLimit()]);

  return (
    <EmpresasManager
      tenantSlug={tenantSlug}
      initialEmpresas={empresas}
      limit={limit ?? { used: 0, allowed: 1 }}
    />
  );
}
