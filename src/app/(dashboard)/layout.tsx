import { redirect } from "next/navigation";
import { getCurrentUser, isCurrentUserDev } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AssistantChatPanel } from "@/components/assistant/AssistantChatPanel";
import { TenantThemeProvider } from "@/lib/theme/TenantThemeContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();

  if (!current) {
    redirect("/login");
  }

  const isDev = await isCurrentUserDev();

  // Conta de dev "pura" (sem CRM próprio) não tem linha em profiles — manda
  // direto pro painel dev em vez de renderizar um dashboard de tenant vazio.
  if (!current.profile) {
    redirect(isDev ? "/dev" : "/login");
  }

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, brand_color, assistant_button_position")
    .eq("id", current.profile.tenant_id)
    .single();

  const name = current.isDevViewing
    ? `Dev (${current.user.email})`
    : current.profile?.full_name || current.user.email || "Usuário";
  const tenantName = tenant?.name ?? "CRM";
  const brandColor = tenant?.brand_color ?? "#4f46e5";
  const buttonPosition = tenant?.assistant_button_position ?? "bottom-left";
  const showSettings = current.profile.role === "owner" || current.profile.role === "manager";

  return (
    <TenantThemeProvider brandColor={brandColor}>
      <div className="flex min-h-screen">
        <Sidebar tenantName={tenantName} showSettings={showSettings} />
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
          <main className="flex-1 bg-gray-50 p-4 md:p-6">{children}</main>
        </div>
        <AssistantChatPanel position={buttonPosition} />
      </div>
    </TenantThemeProvider>
  );
}
