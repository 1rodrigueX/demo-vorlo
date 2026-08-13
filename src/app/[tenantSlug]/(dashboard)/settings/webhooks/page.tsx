import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { LeadWebhooksManager } from "@/components/settings/LeadWebhooksManager";

export default async function SettingsWebhooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user ? await requireTenantId(supabase, user.id) : null;

  const [{ data: webhooks }, { data: stages }] = await Promise.all([
    tenantId
      ? supabase
          .from("lead_webhooks")
          .select("id, name, token, target_stage_id, welcome_message, is_active, leads_received, created_at")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    tenantId
      ? supabase.from("pipeline_stages").select("id, name").eq("tenant_id", tenantId).order("position")
      : Promise.resolve({ data: [] }),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vorlo.com.br";

  return (
    <LeadWebhooksManager webhooks={webhooks ?? []} stages={stages ?? []} siteUrl={siteUrl} />
  );
}
