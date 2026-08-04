import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { TrajetoriasList, type FlowListItem } from "@/components/automations/TrajetoriasList";
import { parseGraph } from "@/lib/automations/flow-types";

export default async function TrajetoriasPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const supabase = await createClient();
  // Tolerante à migration 0069 ainda não aplicada: se a tabela não existe, a
  // query erra e `data` vem null — a lista só aparece vazia, sem quebrar.
  const { data } = await supabase
    .from("automation_flows")
    .select("id, name, status, updated_at, graph")
    .eq("tenant_id", current.profile.tenant_id)
    .order("updated_at", { ascending: false });

  const flows: FlowListItem[] = (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    updated_at: f.updated_at,
    nodeCount: parseGraph(f.graph).nodes.length,
  }));

  const canEdit = current.profile.role === "owner" || current.profile.role === "manager";

  return <TrajetoriasList flows={flows} canEdit={canEdit} />;
}
