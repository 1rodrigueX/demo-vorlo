import { z } from "zod";

export const checkoutSchema = z.object({
  companyName: z.string().trim().min(2, "Informe o nome da empresa"),
  ownerFullName: z.string().trim().min(2, "Informe seu nome"),
  ownerEmail: z.string().trim().email("Email inválido"),
  extraSellers: z.coerce.number().int().min(0).max(500),
  extraManagers: z.coerce.number().int().min(0).max(500),
  extraAgents: z.coerce.number().int().min(0).max(500),
  extraIntegrations: z.coerce.number().int().min(0).max(500),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
