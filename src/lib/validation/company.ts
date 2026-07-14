import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  website: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;
