import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { TagsSettingsCard } from "@/components/settings/TagsSettingsCard";
import { CompanyProfileSettingsCard } from "@/components/settings/CompanyProfileSettingsCard";
import { getCompanyAssetUrls } from "@/lib/actions/company-profile";

export default async function SettingsEmpresaPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const supabase = await createClient();
  const [{ data: tags }, { data: companyProfile }, { data: productPhotos }, { data: catalogs }] = await Promise.all([
    supabase.from("tags").select("*").eq("tenant_id", current.profile.tenant_id).order("name"),
    supabase
      .from("tenant_company_profile")
      .select("*")
      .eq("tenant_id", current.profile.tenant_id)
      .maybeSingle(),
    supabase
      .from("company_product_photos")
      .select("*")
      .eq("tenant_id", current.profile.tenant_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_catalogs")
      .select("*")
      .eq("tenant_id", current.profile.tenant_id)
      .order("created_at", { ascending: false }),
  ]);

  const [photoUrlByPath, catalogUrlByPath] = await Promise.all([
    getCompanyAssetUrls(productPhotos ?? []),
    getCompanyAssetUrls(catalogs ?? []),
  ]);
  const productPhotosWithUrl = (productPhotos ?? []).map((p) => ({
    ...p,
    signedUrl: photoUrlByPath[p.storage_path] ?? "",
  }));
  const catalogsWithUrl = (catalogs ?? []).map((c) => ({
    ...c,
    signedUrl: catalogUrlByPath[c.storage_path] ?? "",
  }));

  return (
    <>
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Tags</h2>
        <TagsSettingsCard tags={tags ?? []} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Sobre a empresa (contexto pros agentes de IA)</h2>
        <CompanyProfileSettingsCard
          profile={companyProfile ?? null}
          catalogs={catalogsWithUrl}
          photos={productPhotosWithUrl}
        />
      </Card>
    </>
  );
}
