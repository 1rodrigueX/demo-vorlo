import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { CampaignsManager, type CampaignItem, type Option } from "@/components/campaigns/CampaignsManager";

/**
 * Disparos em massa. Só dono/gerente — é a tela que fala com a base inteira de
 * clientes de uma vez (as policies de 0074_campaigns já barram, isto aqui é
 * só pra não mostrar uma tela vazia pro vendedor).
 */
export default async function DisparosPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const isAdmin = current.profile.role === "owner" || current.profile.role === "manager";
  if (!isAdmin) redirect(`/${tenantSlug}/dashboard`);

  const supabase = await createClient();
  const tenantId = current.profile.tenant_id;

  const [{ data: campaigns }, { data: recipients }, { data: stages }, { data: tags }, { data: sellers }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("id, name, message, status, error, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase.from("campaign_recipients").select("campaign_id, status").eq("tenant_id", tenantId),
      supabase.from("pipeline_stages").select("id, name").eq("tenant_id", tenantId).order("position"),
      supabase.from("tags").select("id, name").eq("tenant_id", tenantId).order("name"),
      supabase.from("profiles").select("id, full_name").eq("tenant_id", tenantId).order("full_name"),
    ]);

  const countsByCampaign = new Map<string, CampaignItem["counts"]>();
  for (const row of recipients ?? []) {
    const counts =
      countsByCampaign.get(row.campaign_id) ??
      { total: 0, sent: 0, failed: 0, pending: 0, optedOut: 0 };

    counts.total++;
    if (row.status === "sent") counts.sent++;
    else if (row.status === "failed") counts.failed++;
    else if (row.status === "pending") counts.pending++;
    else if (row.status === "opted_out") counts.optedOut++;

    countsByCampaign.set(row.campaign_id, counts);
  }

  const items: CampaignItem[] = (campaigns ?? []).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    message: campaign.message,
    status: campaign.status,
    error: campaign.error,
    created_at: campaign.created_at,
    counts: countsByCampaign.get(campaign.id) ?? { total: 0, sent: 0, failed: 0, pending: 0, optedOut: 0 },
  }));

  const toOptions = (rows: { id: string; name?: string; full_name?: string | null }[]): Option[] =>
    rows.map((row) => ({ id: row.id, label: row.name ?? row.full_name ?? "Sem nome" }));

  return (
    <CampaignsManager
      campaigns={items}
      stages={toOptions(stages ?? [])}
      tags={toOptions(tags ?? [])}
      sellers={toOptions(sellers ?? [])}
    />
  );
}
