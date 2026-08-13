import { getErpClientes } from "@/lib/actions/erp-clientes";
import { ClientesTable } from "@/components/erp/cadastros/ClientesTable";

export default async function ClientesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const clientes = await getErpClientes();

  return <ClientesTable tenantSlug={tenantSlug} initialClientes={clientes} />;
}
