"use client";

import { AgentChatPanel } from "./AgentChatPanel";

/** Botão flutuante do FALA AI — o agente principal, sempre presente no dashboard. */
export function AssistantChatPanel({
  agentId,
  position = "bottom-left",
}: {
  agentId: string;
  position?: "bottom-left" | "bottom-right";
}) {
  return (
    <AgentChatPanel
      agentId={agentId}
      position={position}
      title="FALA AI"
      subtitle="Administre seus agentes e tire dúvidas"
      emptyStateHint='Peça algo como "crie um agente SDR" ou "qual valor sugerir pro João?".'
    />
  );
}
