import { z } from "zod";

export const erpCategoriaSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pra categoria").max(60, "Máx. 60 caracteres"),
  parentId: z.string().uuid("Categoria pai inválida").optional().or(z.literal("")),
});
export type ErpCategoriaInput = z.infer<typeof erpCategoriaSchema>;

export const erpProdutoSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pro produto").max(80, "Máx. 80 caracteres"),
  sku: z.string().trim().max(40, "Máx. 40 caracteres").optional().or(z.literal("")),
  categoryId: z.string().uuid("Categoria inválida").optional().or(z.literal("")),
  unit: z.string().trim().max(10, "Máx. 10 caracteres").optional().or(z.literal("")),
  costPriceReais: z.coerce.number().min(0, "Não pode ser negativo").optional(),
  salePriceReais: z.coerce.number().min(0, "Não pode ser negativo").optional(),
  quantity: z.coerce.number().min(0, "Não pode ser negativo").optional(),
  minStock: z.coerce.number().min(0, "Não pode ser negativo").optional(),
});
export type ErpProdutoInput = z.infer<typeof erpProdutoSchema>;

export const erpEmpresaSchema = z.object({
  name: z.string().trim().min(2, "Informe a razão social").max(120, "Máx. 120 caracteres"),
  cnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 14, "CNPJ precisa ter 14 dígitos"),
  regimeTributario: z.enum(["simples", "presumido", "real"]),
  isMatriz: z.boolean().optional(),
  city: z.string().trim().max(60, "Máx. 60 caracteres").optional().or(z.literal("")),
  state: z.string().trim().max(2, "Use a sigla (ex.: SP)").optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo"]).optional(),
});
export type ErpEmpresaInput = z.infer<typeof erpEmpresaSchema>;

export const erpFornecedorSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome pro fornecedor").max(80, "Máx. 80 caracteres"),
  document: z.string().trim().max(20, "Máx. 20 caracteres").optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Máx. 20 caracteres").optional().or(z.literal("")),
  city: z.string().trim().max(60, "Máx. 60 caracteres").optional().or(z.literal("")),
  state: z.string().trim().max(2, "Use a sigla (ex.: SP)").optional().or(z.literal("")),
  category: z.string().trim().max(40, "Máx. 40 caracteres").optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo"]).optional(),
});
export type ErpFornecedorInput = z.infer<typeof erpFornecedorSchema>;

export const erpFuncionarioSchema = z.object({
  fullName: z.string().trim().min(2, "Dê o nome completo").max(80, "Máx. 80 caracteres"),
  role: z.string().trim().max(60, "Máx. 60 caracteres").optional().or(z.literal("")),
  department: z.string().trim().max(60, "Máx. 60 caracteres").optional().or(z.literal("")),
  admissionDate: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo"]).optional(),
});
export type ErpFuncionarioInput = z.infer<typeof erpFuncionarioSchema>;
