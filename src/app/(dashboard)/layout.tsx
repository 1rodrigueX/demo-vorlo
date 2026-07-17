import { redirect } from "next/navigation";
import { getCurrentUser, isCurrentUserDev } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { TenantThemeProvider } from "@/lib/theme/TenantThemeContext";
import { getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";
import { ClickSoundListener } from "@/components/layout/ClickSoundListener";
import { MusicPlayerProvider } from "@/lib/music/MusicPlayerContext";
import { MusicWidget } from "@/components/music/MusicWidget";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login");
  }

  const isDev = await isCurrentUserDev();

  // Conta de dev "pura" (sem CRM próprio) não tem linha em profiles — manda
  // direto pro painel dev em vez de renderizar um dashboard de tenant vazio.
  // Conta comum sem profile é um cadastro que ainda não escolheu/pagou
  // nenhum plano — manda pra escolha de plano.
  if (!current.profile) {
    redirect(isDev ? "/dev" : "/choose-plan");
  }

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "name, brand_color, brand_font, text_size, border_radius, background_color, text_color, logo_storage_path, click_sound_path",
    )
    .eq("id", current.profile.tenant_id)
    .single();

  const name = current.isDevViewing
    ? `Dev (${current.user.email})`
    : current.profile?.full_name || current.user.email || "Usuário";
  const tenantName = tenant?.name ?? "CRM";
  const brandColor = tenant?.brand_color ?? "#4f46e5";
  const logoUrl = tenant?.logo_storage_path ? await getCompanyAssetSignedUrl(tenant.logo_storage_path) : null;
  const clickSoundUrl = tenant?.click_sound_path ? await getCompanyAssetSignedUrl(tenant.click_sound_path) : null;
  const showSettings = current.profile.role === "owner" || current.profile.role === "manager";

  return (
    <TenantThemeProvider
      brandColor={brandColor}
      brandFont={tenant?.brand_font}
      textSize={tenant?.text_size}
      borderRadius={tenant?.border_radius}
      backgroundColor={tenant?.background_color}
      textColor={tenant?.text_color}
    >
      {clickSoundUrl && <ClickSoundListener soundUrl={clickSoundUrl} />}
      <MusicPlayerProvider>
        <div className="flex min-h-screen">
          <Sidebar tenantName={tenantName} logoUrl={logoUrl} showSettings={showSettings} />
          <div className="flex flex-1 flex-col">
            <Topbar
              name={name}
              email={current.user.email ?? ""}
              role={current.isDevViewing ? "dev" : current.profile.role}
              tenantName={tenantName}
              isDev={isDev}
              isDevViewing={current.isDevViewing}
              showSettings={showSettings}
            />
            <main className="flex-1 bg-gray-50 p-3 md:p-4">{children}</main>
          </div>
        </div>
        <MusicWidget />
      </MusicPlayerProvider>
    </TenantThemeProvider>
  );
}
