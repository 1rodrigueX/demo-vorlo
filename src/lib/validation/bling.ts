import { z } from "zod";

export const createBlingConnectionSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome pra essa conexão").max(60),
  clientId: z.string().trim().min(1, "Informe o Client ID"),
  clientSecret: z.string().trim().min(1, "Informe o Client Secret"),
});

export type CreateBlingConnectionInput = z.infer<typeof createBlingConnectionSchema>;

export const updateBlingCredentialsSchema = z.object({
  clientId: z.string().trim().min(1, "Informe o Client ID"),
  clientSecret: z.string().trim().min(1, "Informe o Client Secret"),
});

export type UpdateBlingCredentialsInput = z.infer<typeof updateBlingCredentialsSchema>;
