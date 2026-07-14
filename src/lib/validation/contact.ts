import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contato"),
  email: z.union([z.email("Email inválido"), z.literal("")]).optional(),
  phone: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\+[1-9]\d{7,14}$/, "Use o formato internacional, ex: +5511999999999"),
      z.literal(""),
    ])
    .optional(),
  leadSource: z.string().trim().optional(),
  companyId: z.union([z.uuid(), z.literal("")]).optional(),
  // Preenchidos quando o vendedor cadastra a empresa direto pelo contato,
  // em vez de escolher uma já existente.
  companyName: z.string().trim().optional(),
  companyWebsite: z.string().trim().optional(),
  companyNotes: z.string().trim().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
