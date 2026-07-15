import { z } from "zod";

export const updateBlingCredentialsSchema = z.object({
  clientId: z.string().trim().min(1, "Informe o Client ID"),
  clientSecret: z.string().trim().min(1, "Informe o Client Secret"),
});

export type UpdateBlingCredentialsInput = z.infer<typeof updateBlingCredentialsSchema>;
