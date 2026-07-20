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
