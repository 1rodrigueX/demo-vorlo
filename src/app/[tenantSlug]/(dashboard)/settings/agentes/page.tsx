import { listAgents } from "@/lib/actions/ai-agents";
import { AiAgentsManager } from "@/components/settings/AiAgentsManager";

export default async function SettingsAgentesPage() {
  const agents = await listAgents();
  return <AiAgentsManager initialAgents={agents} />;
}
