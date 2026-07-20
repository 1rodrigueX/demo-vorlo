import { z } from "zod";

export const dealProdutoSchema = z.object({
  dealId: z.string().uuid("Negócio inválido"),
  estoqueItemId: z.string().uuid("Escolha um produto"),
  quantity: z.coerce.number().positive("Informe uma quantidade maior que zero"),
});
export type DealProdutoInput = z.infer<typeof dealProdutoSchema>;
