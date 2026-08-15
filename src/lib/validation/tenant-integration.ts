import { z } from "zod";

export const saveOpenAiKeySchema = z.object({
  apiKey: z.string().trim().min(1, "Informe a chave da API"),
});

export type SaveOpenAiKeyInput = z.infer<typeof saveOpenAiKeySchema>;
