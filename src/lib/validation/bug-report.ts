import { z } from "zod";

export const bugReportSchema = z.object({
  message: z.string().trim().min(5, "Descreva o problema com mais detalhe").max(2000, "Máx. 2000 caracteres"),
  severity: z.enum(["baixa", "media", "alta", "critica"]),
});

export type BugReportInput = z.infer<typeof bugReportSchema>;
