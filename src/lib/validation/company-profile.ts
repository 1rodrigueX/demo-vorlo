import { z } from "zod";

export const companyProfileSchema = z.object({
  description: z
    .string()
    .trim()
    .max(4000, "Máximo de 4000 caracteres")
    .optional()
    .transform((v) => (v ? v : null)),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
  instagram: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export const productPhotoCaptionSchema = z.object({
  caption: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});
