import { z } from "zod";

export const createLeadWebhookSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pra esse webhook (ex: Facebook Ads)"),
  targetStageId: z.string().uuid("Escolha uma coluna do funil").optional().or(z.literal("")),
  welcomeMessage: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateLeadWebhookInput = z.infer<typeof createLeadWebhookSchema>;

// Payload que chega no endpoint público — vem de fora (formulário externo),
// então tudo opcional exceto ter pelo menos um jeito de identificar a pessoa.
export const incomingLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().min(8).max(20).optional().or(z.literal("")),
    message: z.string().trim().max(2000).optional(),
    company_name: z.string().trim().max(200).optional(),
  })
  .refine((data) => !!data.email || !!data.phone, {
    message: "Informe ao menos email ou telefone",
  });

export type IncomingLeadInput = z.infer<typeof incomingLeadSchema>;
