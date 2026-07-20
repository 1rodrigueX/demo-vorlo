import { z } from "zod";

export const funcionarioSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  turnoId: z.string().uuid().optional().or(z.literal("")),
  maquinaId: z.string().uuid().optional().or(z.literal("")),
});
export type FuncionarioInput = z.infer<typeof funcionarioSchema>;

export const apontamentoSchema = z
  .object({
    produtoId: z.string().uuid("Escolha um produto"),
    turnoId: z.string().uuid().optional().or(z.literal("")),
    maquinaId: z.string().uuid().optional().or(z.literal("")),
    estiloId: z.string().uuid().optional().or(z.literal("")),
    quantity: z.coerce.number().min(0, "Não pode ser negativo").default(0),
    perdas: z.coerce.number().min(0, "Não pode ser negativo").default(0),
    note: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((data) => data.quantity > 0 || data.perdas > 0, {
    message: "Informe a quantidade produzida ou as perdas",
    path: ["quantity"],
  });
export type ApontamentoInput = z.infer<typeof apontamentoSchema>;
