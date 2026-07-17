import { redirect } from "next/navigation";
import { getCurrentUser, isCurrentUserDev } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { TenantThemeProvider } from "@/lib/theme/TenantThemeContext";
import { getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";
import { ClickSoundListener } from "@/components/layout/ClickSoundListener";
// Música desativada temporariamente (a pedido do usuário, 2026-07-17) — ver
// nota mais abaixo, antes do JSX que ficaria no lugar do children.
// import { MusicPlayerProvider } from "@/lib/music/MusicPlayerContext";
// import { MusicWidget } from "@/components/music/MusicWidget";
// import { SpotifyPlayerProvider } from "@/lib/spotify/SpotifyPlayerContext";
// import { getSpotifyStatus } from "@/lib/actions/spotify";

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
    .select("name, status, logo_storage_path, click_sound_path")
    .eq("id", current.profile.tenant_id)
    .single();

  // Dev "visitando" um tenant (suporte) não é bloqueado por inadimplência —
  // só o próprio dono/equipe do CRM é.
  if (tenant?.status === "suspended" && !current.isDevViewing) {
    redirect("/billing-pendente");
  }

  const name = current.isDevViewing
    ? `Dev (${current.user.email})`
    : current.profile?.full_name || current.user.email || "Usuário";
  const tenantName = tenant?.name ?? "CRM";
  const logoUrl = tenant?.logo_storage_path ? await getCompanyAssetSignedUrl(tenant.logo_storage_path) : null;
  const clickSoundUrl = tenant?.click_sound_path ? await getCompanyAssetSignedUrl(tenant.click_sound_path) : null;
  const showSettings = current.profile.role === "owner" || current.profile.role === "manager";
  // const spotifyStatus = await getSpotifyStatus();

  return (
    <TenantThemeProvider>
      {clickSoundUrl && <ClickSoundListener soundUrl={clickSoundUrl} />}
      {/*
        Música (YouTube + Spotify) desativada temporariamente — nem o SDK do
        YouTube nem o Web Playback SDK do Spotify carregam enquanto isso
        estiver comentado. Pra reativar, volta essa árvore de providers:

        <MusicPlayerProvider>
          <SpotifyPlayerProvider enabled={spotifyStatus.connected}>
            ...o <div className="flex min-h-screen">...</div> abaixo...
            <MusicWidget />
          </SpotifyPlayerProvider>
        </MusicPlayerProvider>
      */}
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
          <main className="flex-1 bg-gray-50 p-3 md:p-4">
            {tenant?.status === "past_due" && !current.isDevViewing && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                A mensalidade está pendente. Confira o e-mail de cobrança pra regularizar antes da suspensão do
                acesso.
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </TenantThemeProvider>
  );
}
