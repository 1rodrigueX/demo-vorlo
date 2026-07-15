import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { TenantBrandingForm } from "@/components/settings/TenantBrandingForm";
import { NewTeamMemberButton } from "@/components/settings/NewTeamMemberButton";
import { WhatsAppSettingsForm } from "@/components/settings/WhatsAppSettingsForm";
import { BlingSettingsCard } from "@/components/settings/BlingSettingsCard";
import { AnthropicSettingsCard } from "@/components/settings/AnthropicSettingsCard";
import { EmailIntegrationsCard } from "@/components/settings/EmailIntegrationsCard";
import { ROLE_LABEL } from "@/lib/utils/roles";

function maskApiKey(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return `sk-ant-...${tail}`;
}

const BLING_STATUS_MESSAGE: Record<string, { text: string; tone: "error" | "success" }> = {
  not_configured: {
    text: "Salve o Client ID e o Client Secret do Bling antes de conectar.",
    tone: "error",
  },
  error: {
    text: "Não foi possível concluir a conexão com o Bling. Tente novamente.",
    tone: "error",
  },
  connected: { text: "Bling conectado com sucesso!", tone: "success" },
};

const INTEGRATION_STATUS_MESSAGE: Record<string, { text: (provider: string) => string; tone: "error" | "success" }> = {
  not_configured: {
    text: () => "Essa integração ainda não está disponível — fale com o suporte.",
    tone: "error",
  },
  error: {
    text: (provider) => `Não foi possível concluir a conexão com o ${provider === "gmail" ? "Gmail" : "Outlook"}. Tente novamente.`,
    tone: "error",
  },
  connected: {
    text: (provider) => `${provider === "gmail" ? "Gmail" : "Outlook"} conectado com sucesso!`,
    tone: "success",
  },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ bling?: string; integration?: string; provider?: string }>;
}) {
  const { bling, integration, provider } = await searchParams;
  const blingStatusMessage = bling ? BLING_STATUS_MESSAGE[bling] : undefined;
  const integrationStatusMessage = integration ? INTEGRATION_STATUS_MESSAGE[integration] : undefined;

  const current = await getCurrentUser();
  if (!current?.profile) redirect("/dashboard");

  const isAdmin = current.profile.role === "owner" || current.profile.role === "manager";
  if (!isAdmin) redirect("/dashboard");

  const supabase = await createClient();
  const [
    { data: tenant },
    { data: members },
    { data: whatsappConnection },
    { data: blingConnection },
    { data: anthropicIntegration },
    { data: emailIntegrations },
  ] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", current.profile.tenant_id).single(),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("tenant_id", current.profile.tenant_id)
      .order("role"),
    supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", current.profile.tenant_id)
      .single(),
    supabase
      .from("bling_connections")
      .select("*")
      .eq("tenant_id", current.profile.tenant_id)
      .maybeSingle(),
    supabase
      .from("tenant_integrations")
      .select("status, credentials, last_error, last_tested_at")
      .eq("tenant_id", current.profile.tenant_id)
      .eq("provider", "anthropic")
      .maybeSingle(),
    supabase
      .from("tenant_integrations")
      .select("provider, name, access_token")
      .eq("tenant_id", current.profile.tenant_id)
      .in("provider", ["gmail", "outlook"]),
  ]);

  if (!tenant) redirect("/dashboard");

  const anthropicApiKey = (anthropicIntegration?.credentials as { apiKey?: string } | null)?.apiKey;
  const gmailIntegration = emailIntegrations?.find((i) => i.provider === "gmail");
  const outlookIntegration = emailIntegrations?.find((i) => i.provider === "outlook");

  const sellerCount = (members ?? []).filter((m) => m.role === "member").length;
  const managerCount = (members ?? []).filter((m) => m.role === "manager").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Personalize seu CRM e gerencie sua equipe.</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Aparência</h2>
        <TenantBrandingForm tenant={tenant} />
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

      {whatsappConnection && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">WhatsApp</h2>
          <WhatsAppSettingsForm
            connection={whatsappConnection}
            tenantId={tenant.id}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
          />
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Bling</h2>
        {blingStatusMessage && (
          <p
            className={
              blingStatusMessage.tone === "success"
                ? "mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                : "mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            }
          >
            {blingStatusMessage.text}
          </p>
        )}
        <BlingSettingsCard
          connection={blingConnection ?? null}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
        />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">E-mail</h2>
        {integrationStatusMessage && (
          <p
            className={
              integrationStatusMessage.tone === "success"
                ? "mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                : "mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            }
          >
            {integrationStatusMessage.text(provider ?? "")}
          </p>
        )}
        <EmailIntegrationsCard
          gmailEmail={gmailIntegration?.access_token ? gmailIntegration.name || "conta conectada" : null}
          outlookEmail={outlookIntegration?.access_token ? outlookIntegration.name || "conta conectada" : null}
        />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Inteligência Artificial</h2>
        <AnthropicSettingsCard
          status={anthropicIntegration?.status ?? "disconnected"}
          keyPreview={anthropicApiKey ? maskApiKey(anthropicApiKey) : null}
          lastError={anthropicIntegration?.last_error ?? null}
          lastTestedAt={anthropicIntegration?.last_tested_at ?? null}
        />
      </Card>
    </div>
  );
}
