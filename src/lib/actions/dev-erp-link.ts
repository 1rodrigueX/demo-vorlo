"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";

export type ActionState = { error?: string } | null;

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Copia os cadastros "de back-office" (Produtos/Categorias/Fornecedores/
 * Funcionários) do tenant ERP standalone antigo pro tenant do CRM recém-
 * vinculado — cópia única, não é sincronização contínua. Clientes/Vendedores/
 * Usuários não entram aqui: já são contacts/profiles do próprio CRM, sempre
 * foram (ver erp/cadastros/clientes). Categorias entram primeiro pra poder
 * remapear category_id/parent_id pros ids novos (não dá pra manter os ids
 * antigos — pertenciam ao outro tenant).
 */
async function copyBackofficeData(admin: Admin, fromTenantId: string, toTenantId: string): Promise<void> {
  const { data: categorias } = await admin
    .from("erp_categorias")
    .select("id, name, parent_id")
    .eq("tenant_id", fromTenantId);

  const categoriaIdMap = new Map<string, string>();
  for (const c of categorias ?? []) categoriaIdMap.set(c.id, randomUUID());

  if (categorias?.length) {
    await admin.from("erp_categorias").insert(
      categorias.map((c) => ({
        id: categoriaIdMap.get(c.id),
        tenant_id: toTenantId,
        name: c.name,
        parent_id: c.parent_id ? (categoriaIdMap.get(c.parent_id) ?? null) : null,
      })),
    );
  }

  const { data: produtos } = await admin
    .from("erp_produtos")
    .select("name, sku, category_id, unit, cost_price_cents, sale_price_cents, quantity, min_stock")
    .eq("tenant_id", fromTenantId);
  if (produtos?.length) {
    await admin.from("erp_produtos").insert(
      produtos.map((p) => ({
        ...p,
        tenant_id: toTenantId,
        category_id: p.category_id ? (categoriaIdMap.get(p.category_id) ?? null) : null,
      })),
    );
  }

  const { data: fornecedores } = await admin
    .from("erp_fornecedores")
    .select("name, document, email, phone, city, state, category, status")
    .eq("tenant_id", fromTenantId);
  if (fornecedores?.length) {
    await admin.from("erp_fornecedores").insert(fornecedores.map((f) => ({ ...f, tenant_id: toTenantId })));
  }

  const { data: funcionarios } = await admin
    .from("erp_funcionarios")
    .select("full_name, role, department, admission_date, status")
    .eq("tenant_id", fromTenantId);
  if (funcionarios?.length) {
    await admin.from("erp_funcionarios").insert(funcionarios.map((f) => ({ ...f, tenant_id: toTenantId })));
  }
}

/**
 * Vincula um tenant CRM a um tenant ERP standalone comprados separadamente —
 * concede ao CRM sua própria entitlement de ERP (grátis, mesmo mecanismo dos
 * módulos "dev-criados": tenant_products sem next_billing_at, então o cron de
 * cobrança nunca cobra essa linha). Depois disso o ERP passa a abrir de
 * verdade dentro do CRM, com dados vivendo no tenant_id do próprio CRM —
 * current_tenant_has_erp() já passa a valer sem nenhuma mudança de RPC.
 *
 * De propósito NÃO tenta unificar/ler os dados dos dois tenants em runtime
 * (reabriria a classe de bug de isolamento de tenant fechada na PR de
 * segurança) — só grava linkedTenantId pra rastreabilidade e, se pedido,
 * copia uma vez os cadastros de back-office.
 */
export async function linkCrmToErpTenant(
  crmTenantId: string,
  erpTenantSlug: string,
  opts: { copyBackofficeData: boolean },
): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const admin = createAdminClient();

  const [{ data: crmTenant }, { data: erpTenant }] = await Promise.all([
    admin.from("tenants").select("id, billing_plan_id").eq("id", crmTenantId).maybeSingle(),
    admin.from("tenants").select("id, billing_plan_id").eq("slug", erpTenantSlug.trim().toLowerCase()).maybeSingle(),
  ]);
  if (!crmTenant) return { error: "Tenant do CRM não encontrado" };
  if (!erpTenant) return { error: "Nenhum tenant encontrado com esse slug" };
  if (crmTenant.id === erpTenant.id) return { error: "Selecione dois tenants diferentes" };
  if (!crmTenant.billing_plan_id) return { error: "O tenant informado como CRM não tem um plano de CRM ativo" };
  if (erpTenant.billing_plan_id) return { error: "O tenant informado como ERP standalone já tem um CRM — não é standalone" };

  const erpTenantId = erpTenant.id;

  const [{ data: crmAlreadyHasErp }, { data: erpHasErp }] = await Promise.all([
    admin
      .from("tenant_products")
      .select("tenant_id")
      .eq("tenant_id", crmTenantId)
      .eq("product", "erp")
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("tenant_products")
      .select("tenant_id")
      .eq("tenant_id", erpTenantId)
      .eq("product", "erp")
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (crmAlreadyHasErp) return { error: "Esse CRM já tem ERP ativo" };
  if (!erpHasErp) return { error: "Esse tenant não tem ERP ativo" };

  const { error: tenantError } = await admin
    .from("tenants")
    .update({ linked_tenant_id: erpTenantId })
    .eq("id", crmTenantId);
  if (tenantError) return { error: `Não foi possível registrar o vínculo: ${tenantError.message}` };

  const { error: productError } = await admin.from("tenant_products").insert({
    tenant_id: crmTenantId,
    product: "erp",
    status: "active",
    monthly_amount_cents: 0,
    activated_at: new Date().toISOString(),
  });
  if (productError) return { error: `Vínculo salvo, mas ativar o ERP no CRM falhou: ${productError.message}` };

  if (opts.copyBackofficeData) {
    try {
      await copyBackofficeData(admin, erpTenantId, crmTenantId);
    } catch (err) {
      return {
        error: `ERP ativado no CRM, mas a cópia dos cadastros falhou: ${err instanceof Error ? err.message : "erro desconhecido"}`,
      };
    }
  }

  revalidatePath("/dev");
  return null;
}
