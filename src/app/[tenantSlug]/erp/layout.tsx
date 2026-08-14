import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";
import { getErpNotificacoes } from "@/lib/actions/erp-notificacoes";
import { getErpEmpresas } from "@/lib/actions/erp-empresas";
import { TenantThemeProvider } from "@/lib/theme/TenantThemeContext";
import { ErpShell } from "@/components/erp/layout/ErpShell";
import { CURRENT_EMPRESA_COOKIE } from "@/lib/erp/empresaCookie";
import "@/components/erp/documents/print.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-erp-sans" });

/**
 * Shell do módulo ERP — isolado do CRM de propósito (não herda Sidebar/Topbar
 * do grupo (dashboard), mesmo padrão de "módulo solto" que /producao já usa,
 * mas com os tokens de tema padrão em vez de paleta neon hardcoded).
 *
 * ERP é add-on pago, separado do CRM e dos outros módulos (Financeiro/
 * Estoque/Produção reais) — mesmo padrão deles: current_tenant_has_erp()
 * decide o acesso, sem depender de assinatura de CRM.
 *
 * Grande parte das telas ainda é mock (ver plano aprovado) — Cadastros,
 * Propostas e o seletor de empresa/filial do Topbar já são reais. O
 * Dashboard geral também: Faturamento/Vendas/Propostas abertas/Vendas por
 * status vêm de erp_propostas de verdade (ver erp-dashboard.ts); só os
 * blocos de Financeiro e Produção do Dashboard continuam sem dado próprio
 * (mostram "ainda não disponível" em vez de número inventado) até essas
 * frentes virarem reais. Notificações do sino também: só o evento "SDR
 * montou proposta" tem dado real, o resto do sino segue sem fonte própria
 * ainda.
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
  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: current.user.id });
  if (!hasErp) redirect("/comprar-erp");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, logo_storage_path")
    .eq("id", current.profile.tenant_id)
    .maybeSingle();

  const logoUrl = tenant?.logo_storage_path ? await getCompanyAssetSignedUrl(tenant.logo_storage_path) : null;
  void logoUrl; // reservado — ErpSidebar hoje usa um ícone fixo; trocar por logo real é ajuste visual futuro, não estrutural.

  const userName = current.profile.full_name || current.user.email || "Usuário";
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("erp_sidebar_collapsed")?.value === "1";
  const currentEmpresaId = cookieStore.get(CURRENT_EMPRESA_COOKIE)?.value ?? null;
  const [notifications, empresas] = await Promise.all([getErpNotificacoes(), getErpEmpresas()]);

  return (
    <div className={`${inter.variable} font-[family-name:var(--font-erp-sans)]`}>
      <TenantThemeProvider>
        <ErpShell
          tenantSlug={tenantSlug}
          userName={userName}
          userEmail={current.user.email ?? ""}
          userRole={current.profile.role}
          sidebarDefaultCollapsed={sidebarCollapsed}
          initialNotifications={notifications}
          empresas={empresas}
          currentEmpresaId={currentEmpresaId}
        >
          {children}
        </ErpShell>
      </TenantThemeProvider>
    </div>
  );
}
