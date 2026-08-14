"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { createTransportadoraTenantSchema } from "@/lib/validation/tenant";
import { notifyNewTransportadoraTenant } from "@/lib/discord/notify";

export type ActionState = { error?: string } | null;

/**
 * Cria uma empresa de Transportadora direto pelo painel dev, sem passar pelo
 * checkout do Mercado Pago — mesmo espírito do "Novo CRM" (tenants.ts):
 * acesso liberado na hora, sem cobrança (tenant_products sem next_billing_at,
 * então o cron de cobrança nunca pega essa linha, ver billing-cycle/route.ts).
 */
export async function createTransportadoraTenant(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const parsed = createTransportadoraTenantSchema.safeParse({
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

  const { data: plan } = await admin
    .from("transportadora_plans")
    .select("id, monthly_price_cents")
    .eq("is_default", true)
    .maybeSingle();
  if (!plan) {
    return { error: "Nenhum plano de Transportadora cadastrado" };
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
    product: "transportadora",
    status: "active",
    plan_id: plan.id,
    monthly_amount_cents: plan.monthly_price_cents,
    activated_at: new Date().toISOString(),
  });
  if (productError) {
    return { error: `Empresa criada, mas ativar a Transportadora falhou: ${productError.message}` };
  }

  // fator_imposto default (0.85) — o app Flutter espera essa linha existir no primeiro login.
  await admin.from("transportadora_configuracoes").upsert({ tenant_id: tenant.id }, { onConflict: "tenant_id" });

  void notifyNewTransportadoraTenant(parsed.data.name, parsed.data.slug);

  revalidatePath("/dev");
  return null;
}
