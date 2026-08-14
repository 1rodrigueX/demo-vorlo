"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { createProducaoTenantSchema } from "@/lib/validation/tenant";
import { notifyNewProducaoTenant } from "@/lib/discord/notify";

export type ActionState = { error?: string } | null;

/**
 * Cria uma empresa de Controle de Produção direto pelo painel dev. Produção
 * depende de Estoque pra linkar produtos (ver producao-produtos.ts), então
 * essa criação já ativa os dois produtos juntos — senão o tenant nasceria
 * sem conseguir cadastrar nenhum produto.
 */
export async function createProducaoTenant(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const parsed = createProducaoTenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    ownerFullName: formData.get("ownerFullName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const admin = createAdminClient();

  const [{ data: producaoPlan }, { data: estoquePlan }] = await Promise.all([
    admin.from("producao_plans").select("id, monthly_price_cents").eq("is_default", true).maybeSingle(),
    admin.from("estoque_plans").select("id, monthly_price_cents").eq("is_default", true).maybeSingle(),
  ]);
  if (!producaoPlan) return { error: "Nenhum plano de Produção cadastrado" };
  if (!estoquePlan) return { error: "Nenhum plano de Estoque cadastrado" };

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: parsed.data.name, slug: parsed.data.slug })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    const message = tenantError?.code === "23505" ? "Já existe uma empresa com esse slug" : tenantError?.message;
    return { error: `Não foi possível criar a empresa: ${message ?? "erro desconhecido"}` };
  }

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.ownerEmail,
    password: parsed.data.ownerPassword,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.ownerFullName,
      tenant_id: tenant.id,
      role: "owner",
    },
  });

  if (userError || !created.user) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    return { error: `Não foi possível criar o dono da empresa: ${userError?.message ?? "erro desconhecido"}` };
  }

  // handle_new_user() (trigger em auth.users) é código morto desde a migração
  // pro Auth.js — createUser() do shim só grava em app_users, nunca em
  // auth.users, então o trigger nunca dispara. Sem isso, o dono não ganhava
  // profile nenhum e não conseguia nem logar.
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: parsed.data.ownerFullName,
    tenant_id: tenant.id,
    role: "owner",
  });
  if (profileError) {
    return { error: `Empresa criada, mas o profile do dono falhou: ${profileError.message}` };
  }

  const { error: productError } = await admin.from("tenant_products").insert([
    {
      tenant_id: tenant.id,
      product: "producao",
      status: "active",
      plan_id: producaoPlan.id,
      monthly_amount_cents: producaoPlan.monthly_price_cents,
      activated_at: new Date().toISOString(),
    },
    {
      tenant_id: tenant.id,
      product: "estoque",
      status: "active",
      plan_id: estoquePlan.id,
      monthly_amount_cents: estoquePlan.monthly_price_cents,
      activated_at: new Date().toISOString(),
    },
  ]);
  if (productError) {
    return { error: `Empresa criada, mas ativar Produção/Estoque falhou: ${productError.message}` };
  }

  void notifyNewProducaoTenant(parsed.data.name, parsed.data.slug);

  revalidatePath("/dev");
  return null;
}
