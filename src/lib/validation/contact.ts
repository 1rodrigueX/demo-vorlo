import { z } from "zod";

// formData.get() retorna null (não undefined) pra campo que não existe no
// HTML no momento do submit — acontece com os campos condicionais deste
// formulário (companyId vs. companyName/Website/Notes, dependendo do modo).
// .nullish() aceita os dois, .optional() sozinho rejeitava null.
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do contato"),
  email: z.union([z.email("Email inválido"), z.literal("")]).nullish(),
  phone: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\+[1-9]\d{7,14}$/, "Use o formato internacional, ex: +5511999999999"),
      z.literal(""),
    ])
    .nullish(),
  leadSource: z.string().trim().nullish(),
  companyId: z.union([z.uuid(), z.literal("")]).nullish(),
  // Preenchidos quando o vendedor cadastra a empresa direto pelo contato,
  // em vez de escolher uma já existente.
  companyName: z.string().trim().nullish(),
  companyWebsite: z.string().trim().nullish(),
  companyNotes: z.string().trim().nullish(),
  // Usados só pra completar o cadastro no Bling (CPF/CNPJ e endereço) —
  // nenhum é obrigatório pro contato existir no CRM.
  cpfCnpj: z.string().trim().nullish(),
  addressZip: z.string().trim().nullish(),
  addressStreet: z.string().trim().nullish(),
  addressNumber: z.string().trim().nullish(),
  addressComplement: z.string().trim().nullish(),
  addressNeighborhood: z.string().trim().nullish(),
  addressCity: z.string().trim().nullish(),
  addressState: z.string().trim().nullish(),
});

export type ContactInput = z.infer<typeof contactSchema>;
