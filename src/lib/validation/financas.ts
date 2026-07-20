import { z } from "zod";

export const lancamentoSchema = z.object({
  context: z.enum(["pessoal", "empresarial"]),
  type: z.enum(["receita", "despesa"]),
  category: z.string().trim().min(1, "Escolha uma categoria"),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  // Digitado em reais no formulário — convertido pra centavos aqui, não no client.
  amountReais: z.coerce.number().positive("Informe um valor maior que zero"),
  entryDate: z.string().min(1, "Escolha uma data"),
});

export type LancamentoInput = z.infer<typeof lancamentoSchema>;

export const categoriaSchema = z.object({
  type: z.enum(["receita", "despesa"]),
  name: z.string().trim().min(2, "Dê um nome pra categoria").max(40, "Máx. 40 caracteres"),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;

export const estoqueItemSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pro item").max(60, "Máx. 60 caracteres"),
  unit: z.string().trim().max(10, "Máx. 10 caracteres").optional().or(z.literal("")),
});

export type EstoqueItemInput = z.infer<typeof estoqueItemSchema>;

export const estoqueMovimentacaoSchema = z.object({
  itemId: z.string().uuid("Escolha um item"),
  type: z.enum(["entrada", "saida"]),
  quantity: z.coerce.number().positive("Informe uma quantidade maior que zero"),
  unitCostReais: z.coerce.number().min(0).optional(),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export type EstoqueMovimentacaoInput = z.infer<typeof estoqueMovimentacaoSchema>;

export const estoqueItemEditSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, "Dê um nome pro item").max(60, "Máx. 60 caracteres"),
  unit: z.string().trim().max(10, "Máx. 10 caracteres").optional().or(z.literal("")),
  quantity: z.coerce.number().min(0, "Não pode ser negativo"),
  unitCostReais: z.coerce.number().min(0, "Não pode ser negativo"),
});

export type EstoqueItemEditInput = z.infer<typeof estoqueItemEditSchema>;
