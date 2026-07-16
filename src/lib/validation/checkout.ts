import { z } from "zod";

export const checkoutSchema = z.object({
  companyName: z.string().trim().min(2, "Informe o nome da empresa"),
  planId: z.string().uuid("Selecione um plano"),
  extraSellers: z.coerce.number().int().min(0).max(500),
  extraManagers: z.coerce.number().int().min(0).max(500),
  extraAgents: z.coerce.number().int().min(0).max(500),
  extraIntegrations: z.coerce.number().int().min(0).max(500),
  anthropicApiKey: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
