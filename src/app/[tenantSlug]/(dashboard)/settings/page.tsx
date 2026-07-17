import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { TenantBrandingForm } from "@/components/settings/TenantBrandingForm";
import { NewTeamMemberButton } from "@/components/settings/NewTeamMemberButton";
import { getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";
import { ROLE_LABEL } from "@/lib/utils/roles";

export default async function SettingsGeralPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const supabase = await createClient();
  const [{ data: tenant }, { data: members }] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", current.profile.tenant_id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("tenant_id", current.profile.tenant_id)
      .order("role"),
  ]);

  if (!tenant) redirect(`/${tenantSlug}/dashboard`);

  const [logoUrl, clickSoundUrl] = await Promise.all([
    tenant.logo_storage_path ? getCompanyAssetSignedUrl(tenant.logo_storage_path) : Promise.resolve(null),
    tenant.click_sound_path ? getCompanyAssetSignedUrl(tenant.click_sound_path) : Promise.resolve(null),
  ]);

  const sellerCount = (members ?? []).filter((m) => m.role === "member").length;
  const managerCount = (members ?? []).filter((m) => m.role === "manager").length;

  return (
    <>
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Aparência</h2>
        <TenantBrandingForm tenant={tenant} logoUrl={logoUrl} clickSoundUrl={clickSoundUrl} />
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Equipe</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {sellerCount}/{tenant.seller_limit} vendedores · {managerCount}/{tenant.manager_limit}{" "}
              gestores
            </p>
          </div>
          <NewTeamMemberButton />
        </div>

        {!members?.length ? (
          <p className="text-sm text-gray-500">Nenhum membro cadastrado ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-900">{m.full_name || "Sem nome"}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
