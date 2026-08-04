import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { FlowEditor } from "@/components/automations/FlowEditor";
import { parseGraph } from "@/lib/automations/flow-types";

export default async function TrajetoriaEditorPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; flowId: string }>;
}) {
  const { tenantSlug, flowId } = await params;
  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const tenantId = current.profile.tenant_id;
  const supabase = await createClient();

  const { data: flow } = await supabase
    .from("automation_flows")
    .select("id, name, status, graph")
    .eq("id", flowId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Não encontrada (ou migration não aplicada) — volta pra lista.
  if (!flow) redirect(`/${tenantSlug}/trajetorias`);

  const [{ data: stages }, { data: members }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name").eq("tenant_id", tenantId).order("position"),
    supabase.from("profiles").select("id, full_name").eq("tenant_id", tenantId).order("full_name"),
  ]);

  const options = {
    stages: (stages ?? []).map((s) => ({ id: s.id, name: s.name })),
    members: (members ?? []).map((m) => ({ id: m.id, name: m.full_name ?? "Sem nome" })),
  };

  const canEdit = current.profile.role === "owner" || current.profile.role === "manager";

  return (
    <FlowEditor
      flowId={flow.id}
      initialName={flow.name}
      initialStatus={flow.status}
      initialGraph={parseGraph(flow.graph)}
      options={options}
      canEdit={canEdit}
    />
  );
}
