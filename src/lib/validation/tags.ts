import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(40),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB"),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
