"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { createEstoqueTenantSchema } from "@/lib/validation/tenant";
import { notifyNewEstoqueTenant } from "@/lib/discord/notify";

export type ActionState = { error?: string } | null;

/**
 * Cria uma empresa de Controle de Estoque direto pelo painel dev, sem
 * checkout — mesmo espírito do "Novo CRM"/"Nova Transportadora"/"Novo
 * Controle de Finanças": acesso liberado na hora, sem cobrança
 * (tenant_products sem next_billing_at, o cron de cobrança nunca pega essa linha).
 */
export async function createEstoqueTenant(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const parsed = createEstoqueTenantSchema.safeParse({
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

  const { data: plan } = await admin.from("estoque_plans").select("id, monthly_price_cents").eq("is_default", true).maybeSingle();
  if (!plan) {
    return { error: "Nenhum plano de Estoque cadastrado" };
  }

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

  const { error: productError } = await admin.from("tenant_products").insert({
    tenant_id: tenant.id,
    product: "estoque",
    status: "active",
    plan_id: plan.id,
    monthly_amount_cents: plan.monthly_price_cents,
    activated_at: new Date().toISOString(),
  });
  if (productError) {
    return { error: `Empresa criada, mas ativar o Estoque falhou: ${productError.message}` };
  }

  void notifyNewEstoqueTenant(parsed.data.name, parsed.data.slug);

  revalidatePath("/dev");
  return null;
}
