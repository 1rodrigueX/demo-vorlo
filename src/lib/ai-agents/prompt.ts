import type { AiAgent, AiAgentMemory } from "@/types/domain";

export function buildSystemPrompt(
  agent: Pick<AiAgent, "system_prompt">,
  memoryFacts: Pick<AiAgentMemory, "label" | "content">[],
  userDisplayName: string,
  contextHint?: string,
): string {
  let prompt = agent.system_prompt;

  if (memoryFacts.length) {
    const facts = memoryFacts.map((f) => `- ${f.label}: ${f.content}`).join("\n");
    prompt += `\n\nFatos que você já registrou sobre este CRM:\n${facts}`;
  }

  prompt += `\n\nUsuário atual: ${userDisplayName}.`;

  if (contextHint) {
    prompt += `\n\n${contextHint}`;
  }

  return prompt;
}
