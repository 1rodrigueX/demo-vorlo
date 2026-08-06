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
  // query erra e `data` vem null — a lista só aparece vazia, sem quebrar. O
  // mesmo vale pra 0072 e as execuções.
  const [{ data }, { data: runs }] = await Promise.all([
    supabase
      .from("automation_flows")
      .select("id, name, status, updated_at, graph")
      .eq("tenant_id", current.profile.tenant_id)
      .order("updated_at", { ascending: false }),
    supabase.from("flow_runs").select("flow_id, status").eq("tenant_id", current.profile.tenant_id),
  ]);

  const activeByFlow = new Map<string, number>();
  const finishedByFlow = new Map<string, number>();
  for (const run of runs ?? []) {
    const bucket = run.status === "running" || run.status === "waiting" ? activeByFlow : finishedByFlow;
    bucket.set(run.flow_id, (bucket.get(run.flow_id) ?? 0) + 1);
  }

  const flows: FlowListItem[] = (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    updated_at: f.updated_at,
    nodeCount: parseGraph(f.graph).nodes.length,
    activeRuns: activeByFlow.get(f.id) ?? 0,
    finishedRuns: finishedByFlow.get(f.id) ?? 0,
  }));

  const canEdit = current.profile.role === "owner" || current.profile.role === "manager";

  return <TrajetoriasList flows={flows} canEdit={canEdit} />;
}
