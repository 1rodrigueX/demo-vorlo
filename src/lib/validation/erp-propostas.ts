import { z } from "zod";

export const erpPropostaItemSchema = z.object({
  produtoId: z.string().uuid("Produto inválido"),
  quantity: z.coerce.number().positive("Informe uma quantidade maior que zero"),
  unitPriceReais: z.coerce.number().min(0, "Não pode ser negativo").optional(),
  discountPct: z.coerce.number().min(0).max(100).optional(),
});
export type ErpPropostaItemInput = z.infer<typeof erpPropostaItemSchema>;

export const erpPropostaSchema = z.object({
  contactId: z.string().uuid("Selecione um cliente"),
  sellerId: z.string().uuid("Selecione um vendedor").optional().or(z.literal("")),
  validUntil: z.string().trim().optional().or(z.literal("")),
  paymentTerm: z.string().trim().max(60, "Máx. 60 caracteres").optional().or(z.literal("")),
  freightType: z.enum(["CIF", "FOB"]).optional(),
  carrierId: z.string().uuid("Transportadora inválida").optional().or(z.literal("")),
  freightReais: z.coerce.number().min(0, "Não pode ser negativo").optional(),
  discountReais: z.coerce.number().min(0, "Não pode ser negativo").optional(),
  notes: z.string().trim().max(500, "Máx. 500 caracteres").optional().or(z.literal("")),
  items: z.array(erpPropostaItemSchema).min(1, "Adicione ao menos um produto"),
});
export type ErpPropostaInput = z.infer<typeof erpPropostaSchema>;
