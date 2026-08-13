import { getErpProfiles } from "@/lib/actions/erp-pessoas";
import { ProfilesTable } from "@/components/erp/cadastros/ProfilesTable";

export default async function UsuariosPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const profiles = await getErpProfiles();

  return (
    <ProfilesTable
      tenantSlug={tenantSlug}
      title="Usuários"
      description="Usuários com acesso ao sistema."
      initialProfiles={profiles}
    />
  );
}
