import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  sellerLimit: z.coerce.number().int().min(1, "Mínimo 1").max(999),
  managerLimit: z.coerce.number().int().min(0).max(999),
  ownerFullName: z.string().trim().min(2, "Informe o nome do dono"),
  ownerEmail: z.string().trim().email("Email inválido"),
  ownerPassword: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantBrandingSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB"),
  brandFont: z.enum(["default", "modern", "classic", "rounded"]),
  textSize: z.enum(["small", "medium", "large"]),
  borderRadius: z.enum(["square", "default", "rounded", "pill"]),
  backgroundColor: z
    .union([z.literal(""), z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB")])
    .optional(),
  textColor: z
    .union([z.literal(""), z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #RRGGBB")])
    .optional(),
});

export type UpdateTenantBrandingInput = z.infer<typeof updateTenantBrandingSchema>;

export const createTeamMemberSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["member", "manager"]),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
