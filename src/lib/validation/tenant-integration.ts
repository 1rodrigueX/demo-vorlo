import { z } from "zod";

export const saveAnthropicKeySchema = z.object({
  apiKey: z.string().trim().min(1, "Informe a chave da API"),
});

export type SaveAnthropicKeyInput = z.infer<typeof saveAnthropicKeySchema>;
