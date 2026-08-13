import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";
import { TenantThemeProvider } from "@/lib/theme/TenantThemeContext";
import { ErpShell } from "@/components/erp/layout/ErpShell";
import "@/components/erp/documents/print.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-erp-sans" });

/**
 * Shell do módulo ERP — isolado do CRM de propósito (não herda Sidebar/Topbar
 * do grupo (dashboard), mesmo padrão de "módulo solto" que /producao já usa,
 * mas com os tokens de tema padrão em vez de paleta neon hardcoded).
 *
 * Fase atual: 100% visual/mock (ver plano aprovado). Único dado real buscado
 * aqui é nome/logo do tenant, pra Sidebar/Topbar não parecerem genéricos
 * enquanto o dono revisa o próprio ambiente — resto do shell (notificações,
 * empresa/filial) é mock em src/mocks/erp/session.ts.
 *
 * Sem guard extra de billing/role: o middleware (src/proxy.ts) já exige
 * sessão logada em qualquer rota fora do allowlist público, e esta fase não
 * tem produto/gate de billing próprio ainda (fica pra quando entrarmos em
 * regras de negócio).
 */
export default async function ErpLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (!current.profile) redirect("/choose-plan");

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, logo_storage_path")
    .eq("id", current.profile.tenant_id)
    .maybeSingle();

  const logoUrl = tenant?.logo_storage_path ? await getCompanyAssetSignedUrl(tenant.logo_storage_path) : null;
  void logoUrl; // reservado — ErpSidebar hoje usa um ícone fixo; trocar por logo real é ajuste visual futuro, não estrutural.

  const userName = current.profile.full_name || current.user.email || "Usuário";
  const sidebarCollapsed = (await cookies()).get("erp_sidebar_collapsed")?.value === "1";

  return (
    <div className={`${inter.variable} font-[family-name:var(--font-erp-sans)]`}>
      <TenantThemeProvider>
        <ErpShell
          tenantSlug={tenantSlug}
          userName={userName}
          userEmail={current.user.email ?? ""}
          userRole={current.profile.role}
          sidebarDefaultCollapsed={sidebarCollapsed}
        >
          {children}
        </ErpShell>
      </TenantThemeProvider>
    </div>
  );
}
