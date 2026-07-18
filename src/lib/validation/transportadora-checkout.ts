import { z } from "zod";

export const transportadoraCheckoutSchema = z.object({
  companyName: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  planId: z.string().uuid("Plano inválido"),
});

export type TransportadoraCheckoutInput = z.infer<typeof transportadoraCheckoutSchema>;
