import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { FunnelAutomationCard } from "@/components/settings/FunnelAutomationCard";
import { FUNNEL_DEFAULTS } from "@/lib/automations/funnel";

export default async function SettingsAutomacoesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("funnel_automation_settings")
    .select(
      "enabled, followup_delay_hours, followup_message, followup_tag_name, inactive_delay_hours, inactive_tag_name, won_message_enabled, won_message",
    )
    .eq("tenant_id", current.profile.tenant_id)
    .maybeSingle();

  const settings = data ?? FUNNEL_DEFAULTS;
  const canEdit = current.profile.role === "owner" || current.profile.role === "manager";

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Automações de funil</h2>
      <FunnelAutomationCard settings={settings} canEdit={canEdit} />
    </Card>
  );
}
