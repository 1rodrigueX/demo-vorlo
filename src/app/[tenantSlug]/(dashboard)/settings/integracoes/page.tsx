import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { WhatsAppSettingsForm } from "@/components/settings/WhatsAppSettingsForm";
import { BlingConnectionsCard } from "@/components/settings/BlingConnectionsCard";
import { AnthropicSettingsCard } from "@/components/settings/AnthropicSettingsCard";
// Música desativada temporariamente (volta como atualização beta mais pra frente).
// import { YoutubeSettingsCard } from "@/components/settings/YoutubeSettingsCard";
import { EmailIntegrationsCard } from "@/components/settings/EmailIntegrationsCard";
import { KommoIntegrationCard } from "@/components/settings/KommoIntegrationCard";
import { PowerBiExportButton } from "@/components/dashboard/PowerBiExportButton";

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

export default async function SettingsIntegracoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ bling?: string; integration?: string; provider?: string }>;
}) {
  const { tenantSlug } = await params;
  const { bling, integration, provider } = await searchParams;
  const blingStatusMessage = bling ? BLING_STATUS_MESSAGE[bling] : undefined;
  const integrationStatusMessage = integration ? INTEGRATION_STATUS_MESSAGE[integration] : undefined;

  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const supabase = await createClient();
  const [
    { data: tenant },
    { data: members },
    { data: whatsappConnection },
    { data: blingConnections },
    { data: anthropicIntegration },
    { data: emailIntegrations },
    { data: kommoIntegration },
    { data: tags },
    { data: apiKeys },
  ] = await Promise.all([
    supabase.from("tenants").select("id, youtube_api_key").eq("id", current.profile.tenant_id).single(),
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
      .order("is_default", { ascending: false }),
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
    supabase
      .from("tenant_integrations")
      .select("status, name, credentials, last_error, last_tested_at")
      .eq("tenant_id", current.profile.tenant_id)
      .eq("provider", "kommo")
      .maybeSingle(),
    supabase.from("tags").select("*").eq("tenant_id", current.profile.tenant_id).order("name"),
    supabase
      .from("tenant_api_keys")
      .select("id, name, key_prefix, created_at, last_used_at")
      .order("created_at", { ascending: false }),
  ]);

  // Mapeamentos vendedor↔Bling das conexões deste tenant. Filtrado pelo id das
  // conexões já buscadas (bling_connection_sellers não tem tenant_id próprio) —
  // em vez do filtro-em-relação-embutida do PostgREST, que não é do shim.
  const blingConnectionIds = (blingConnections ?? []).map((c) => c.id);
  const { data: sellerMappings } = blingConnectionIds.length
    ? await supabase
        .from("bling_connection_sellers")
        .select("bling_connection_id, profile_id, bling_vendedor_id, bling_vendedor_name")
        .in("bling_connection_id", blingConnectionIds)
    : {
        data: [] as {
          bling_connection_id: string;
          profile_id: string;
          bling_vendedor_id: string;
          bling_vendedor_name: string | null;
        }[],
      };

  if (!tenant) redirect(`/${tenantSlug}/dashboard`);

  const anthropicApiKey = (anthropicIntegration?.credentials as { apiKey?: string } | null)?.apiKey;
  const gmailIntegration = emailIntegrations?.find((i) => i.provider === "gmail");
  const outlookIntegration = emailIntegrations?.find((i) => i.provider === "outlook");

  return (
    <>
      {whatsappConnection && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">WhatsApp</h2>
          <WhatsAppSettingsForm
            connection={whatsappConnection}
            tenantId={tenant.id}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20"}
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
        <BlingConnectionsCard
          connections={blingConnections ?? []}
          tags={tags ?? []}
          members={members ?? []}
          sellerMappings={sellerMappings ?? []}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20"}
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
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Kommo</h2>
        <KommoIntegrationCard
          status={(kommoIntegration?.status as "disconnected" | "connected" | "error") ?? "disconnected"}
          subdomain={(kommoIntegration?.credentials as { subdomain?: string } | null)?.subdomain ?? null}
          accountName={kommoIntegration?.name ?? null}
          lastError={kommoIntegration?.last_error ?? null}
          lastTestedAt={kommoIntegration?.last_tested_at ?? null}
          tenantSlug={tenantSlug}
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

      {/*
        Música desativada temporariamente — volta como atualização beta mais
        pra frente. Pra reativar, descomenta o import do YoutubeSettingsCard
        acima e esse card:

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Música</h2>
          <YoutubeSettingsCard apiKey={tenant.youtube_api_key} />
        </Card>
      */}

      <Card className="p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Power BI</h2>
        <p className="mb-4 text-xs text-gray-500">
          Conecte seus negócios e contatos direto no Power BI Desktop pra montar seus próprios relatórios.
        </p>
        <PowerBiExportButton
          apiKeys={apiKeys ?? []}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20"}
        />
      </Card>
    </>
  );
}
