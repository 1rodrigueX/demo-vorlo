import { getErpProfiles } from "@/lib/actions/erp-pessoas";
import { ProfilesTable } from "@/components/erp/cadastros/ProfilesTable";

export default async function VendedoresPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const profiles = await getErpProfiles();

  return (
    <ProfilesTable
      tenantSlug={tenantSlug}
      title="Vendedores"
      description="Equipe com acesso à conta — mesmos usuários do CRM."
      initialProfiles={profiles}
    />
  );
}
