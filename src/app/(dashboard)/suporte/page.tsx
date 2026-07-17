import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { AgentChatPanel } from "@/components/assistant/AgentChatPanel";

export default async function SuportePage() {
  const current = await getCurrentUser();
  if (!current?.profile) redirect("/dashboard");

  const supabase = await createClient();
  const { data: falaAi } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("tenant_id", current.profile.tenant_id)
    .eq("is_fala_ai", true)
    .maybeSingle();

  if (!falaAi) {
    return <p className="text-sm text-gray-500">O FALA AI ainda não foi configurado neste CRM.</p>;
  }

  return (
    <AgentChatPanel
      agentId={falaAi.id}
      mode="inline"
      title="FALA AI"
      subtitle="Administre seus agentes e tire dúvidas"
      emptyStateHint='Peça algo como "crie um agente SDR" ou "como marco uma venda como ganha?".'
    />
  );
}
