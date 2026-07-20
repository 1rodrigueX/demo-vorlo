import { z } from "zod";

export const turnoSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pro turno").max(40, "Máx. 40 caracteres"),
  startTime: z.string().trim().optional().or(z.literal("")),
  endTime: z.string().trim().optional().or(z.literal("")),
});
export type TurnoInput = z.infer<typeof turnoSchema>;

export const maquinaSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pra máquina").max(60, "Máx. 60 caracteres"),
});
export type MaquinaInput = z.infer<typeof maquinaSchema>;

export const estiloSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pro estilo").max(60, "Máx. 60 caracteres"),
  description: z.string().trim().max(200, "Máx. 200 caracteres").optional().or(z.literal("")),
});
export type EstiloInput = z.infer<typeof estiloSchema>;

export const produtoSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pro produto").max(60, "Máx. 60 caracteres"),
  unit: z.string().trim().max(10, "Máx. 10 caracteres").optional().or(z.literal("")),
});
export type ProdutoInput = z.infer<typeof produtoSchema>;

export const receitaItemSchema = z.object({
  produtoId: z.string().uuid("Produto inválido"),
  materiaPrimaId: z.string().uuid("Escolha uma matéria-prima"),
  quantityPerUnit: z.coerce.number().positive("Informe uma quantidade maior que zero"),
});
export type ReceitaItemInput = z.infer<typeof receitaItemSchema>;
