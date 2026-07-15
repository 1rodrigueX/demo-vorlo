import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "Dê um nome pra essa chave").max(60),
});
