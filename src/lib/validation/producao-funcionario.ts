import { z } from "zod";

export const funcionarioSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  turnoId: z.string().uuid().optional().or(z.literal("")),
  maquinaId: z.string().uuid().optional().or(z.literal("")),
});
export type FuncionarioInput = z.infer<typeof funcionarioSchema>;

export const apontamentoSchema = z.object({
  produtoId: z.string().uuid("Escolha um produto"),
  turnoId: z.string().uuid().optional().or(z.literal("")),
  maquinaId: z.string().uuid().optional().or(z.literal("")),
  estiloId: z.string().uuid().optional().or(z.literal("")),
  quantity: z.coerce.number().positive("Informe uma quantidade maior que zero"),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
export type ApontamentoInput = z.infer<typeof apontamentoSchema>;
