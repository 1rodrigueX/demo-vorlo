import { z } from "zod";
import { isReservedSlug } from "@/lib/tenant/reserved-slugs";

export const createTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
    .refine((slug) => !isReservedSlug(slug), "Esse slug é reservado pelo sistema, escolha outro"),
  sellerLimit: z.coerce.number().int().min(1, "Mínimo 1").max(999),
  managerLimit: z.coerce.number().int().min(0).max(999),
  ownerFullName: z.string().trim().min(2, "Informe o nome do dono"),
  ownerEmail: z.string().trim().email("Email inválido"),
  ownerPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const createTransportadoraTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
    .refine((slug) => !isReservedSlug(slug), "Esse slug é reservado pelo sistema, escolha outro"),
  ownerFullName: z.string().trim().min(2, "Informe o nome do dono"),
  ownerEmail: z.string().trim().email("Email inválido"),
  ownerPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export type CreateTransportadoraTenantInput = z.infer<typeof createTransportadoraTenantSchema>;

export const createFinancasTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
    .refine((slug) => !isReservedSlug(slug), "Esse slug é reservado pelo sistema, escolha outro"),
  ownerFullName: z.string().trim().min(2, "Informe o nome do dono"),
  ownerEmail: z.string().trim().email("Email inválido"),
  ownerPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export type CreateFinancasTenantInput = z.infer<typeof createFinancasTenantSchema>;

export const createEstoqueTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
    .refine((slug) => !isReservedSlug(slug), "Esse slug é reservado pelo sistema, escolha outro"),
  ownerFullName: z.string().trim().min(2, "Informe o nome do dono"),
  ownerEmail: z.string().trim().email("Email inválido"),
  ownerPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export type CreateEstoqueTenantInput = z.infer<typeof createEstoqueTenantSchema>;

export const createProducaoTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
    .refine((slug) => !isReservedSlug(slug), "Esse slug é reservado pelo sistema, escolha outro"),
  ownerFullName: z.string().trim().min(2, "Informe o nome do dono"),
  ownerEmail: z.string().trim().email("Email inválido"),
  ownerPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export type CreateProducaoTenantInput = z.infer<typeof createProducaoTenantSchema>;

export const createErpTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
    .refine((slug) => !isReservedSlug(slug), "Esse slug é reservado pelo sistema, escolha outro"),
  ownerFullName: z.string().trim().min(2, "Informe o nome do dono"),
  ownerEmail: z.string().trim().email("Email inválido"),
  ownerPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export type CreateErpTenantInput = z.infer<typeof createErpTenantSchema>;

export const updateTenantBrandingSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
});

export type UpdateTenantBrandingInput = z.infer<typeof updateTenantBrandingSchema>;

export const createTeamMemberSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  role: z.enum(["member", "manager"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida")
    .default("#6366f1"),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
