"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { createErpTenantSchema } from "@/lib/validation/tenant";
import { MODULE_CATALOG } from "@/lib/billing/modules";
import { notifyNewErpTenant } from "@/lib/discord/notify";

export type ActionState = { error?: string } | null;

/**
 * Cria uma empresa de ERP standalone direto pelo painel dev, sem checkout —
 * mesmo espírito do "Novo CRM"/"Nova Transportadora"/etc: acesso liberado na
 * hora, sem cobrança (tenant_products sem next_billing_at, o cron de
 * cobrança nunca pega essa linha). Diferente de Transportadora/Finanças/
 * Estoque/Produção, o ERP não tem uma tabela de planos própria — o preço vem
 * direto do MODULE_CATALOG (mesma fonte usada no checkout pago).
 */
export async function createErpTenant(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const parsed = createErpTenantSchema.safeParse({
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

  const { error: productError } = await admin.from("tenant_products").insert({
    tenant_id: tenant.id,
    product: "erp",
    status: "active",
    monthly_amount_cents: MODULE_CATALOG.erp.priceCents,
    activated_at: new Date().toISOString(),
  });
  if (productError) {
    return { error: `Empresa criada, mas ativar o ERP falhou: ${productError.message}` };
  }

  void notifyNewErpTenant(parsed.data.name, parsed.data.slug);

  revalidatePath("/dev");
  return null;
}
