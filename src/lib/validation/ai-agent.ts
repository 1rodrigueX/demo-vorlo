import { z } from "zod";
import { CREATABLE_AGENT_TYPES, KNOWN_TOOL_KEYS } from "@/lib/ai-agents/templates";

export const createAgentInputSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome para o agente").max(60),
  type: z.enum(CREATABLE_AGENT_TYPES),
  objective: z.string().trim().max(500).optional(),
  systemPrompt: z.string().trim().max(4000).optional(),
  tools: z.array(z.enum(KNOWN_TOOL_KEYS)).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;

export const updateAgentInputSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  objective: z.string().trim().max(500).optional(),
  systemPrompt: z.string().trim().max(4000).optional(),
  tools: z.array(z.enum(KNOWN_TOOL_KEYS)).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;

export const rememberFactSchema = z.object({
  label: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(2000),
});
