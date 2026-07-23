"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { createTenantSchema } from "@/lib/validation/tenant";
import { notifyNewCrmTenant } from "@/lib/discord/notify";
import { grantFreeFinancasEmpresarial } from "@/lib/billing/grant-financas";
import { CRM_MODULE_COUPLING } from "@/lib/crm/isolation";

export type ActionState = { error?: string } | null;

// A SDR de IA já move o lead entre "Atendimento SDR" -> "Qualificado" /
// "Não Qualificado" sozinha (ver sdrPipelineStage.ts) — "Não Qualificado" é
// is_lost pra reaproveitar o mesmo comportamento de fechamento que qualquer
// etapa is_lost já tem.
const DEFAULT_STAGES = [
  { name: "Atendimento SDR", position: 1, color: "#6366f1", is_won: false, is_lost: false },
  { name: "Qualificado", position: 2, color: "#0ea5e9", is_won: false, is_lost: false },
  { name: "Não Qualificado", position: 3, color: "#ef4444", is_won: false, is_lost: true },
  { name: "Proposta", position: 4, color: "#f59e0b", is_won: false, is_lost: false },
  { name: "Fechado", position: 5, color: "#22c55e", is_won: true, is_lost: false },
] as const;

export async function createTenant(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const parsed = createTenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sellerLimit: formData.get("sellerLimit"),
    managerLimit: formData.get("managerLimit"),
    ownerFullName: formData.get("ownerFullName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const admin = createAdminClient();

  // billing_plan_id é o sinal de "esse tenant tem CRM" usado em getAccountServices
  // (central de contas) — sem isso, um CRM criado por aqui (sem cobrança,
  // acesso vitalício) apareceria como "não assinado" pro dono dele.
  const { data: defaultPlan } = await admin.from("billing_plans").select("id").eq("is_default", true).maybeSingle();

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      seller_limit: parsed.data.sellerLimit,
      manager_limit: parsed.data.managerLimit,
      billing_plan_id: defaultPlan?.id ?? null,
    })
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
    return { error: `Não foi possível criar o dono do CRM: ${userError?.message ?? "erro desconhecido"}` };
  }

  await admin
    .from("pipeline_stages")
    .insert(DEFAULT_STAGES.map((stage) => ({ ...stage, tenant_id: tenant.id })));
  // CRM isolado: finanças só é concedida se o acoplamento estiver religado
  // (ver src/lib/crm/isolation.ts).
  if (CRM_MODULE_COUPLING.financas) await grantFreeFinancasEmpresarial(admin, tenant.id);

  void notifyNewCrmTenant(parsed.data.name, parsed.data.slug);

  revalidatePath("/dev");
  return null;
}

export async function setTenantStatus(tenantId: string, status: "active" | "suspended") {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ status }).eq("id", tenantId);
  if (error) return { error: "Não foi possível atualizar o status" };

  revalidatePath("/dev");
  return { error: undefined };
}
