import "server-only";
import type { AdminClient } from "@/lib/supabase/admin";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/financas/categories";

/**
 * Libera o Controle de Finanças Empresarial de graça pra quem assina o CRM
 * — é um benefício incluso, não um produto cobrado à parte nesse caso
 * (monthly_amount_cents = 0, sem next_billing_at, então o cron de cobrança
 * nunca pega essa linha — mesmo padrão usado nas criações via painel dev).
 * Nunca lança erro: se algo falhar aqui, o CRM já foi criado e não deve
 * ser desfeito por causa de um bônus.
 */
export async function grantFreeFinancasEmpresarial(
  admin: AdminClient,
  tenantId: string,
): Promise<void> {
  try {
    const { data: plan } = await admin.from("financas_plans").select("id").eq("is_default", true).maybeSingle();

    const { error: productError } = await admin.from("tenant_products").insert({
      tenant_id: tenantId,
      product: "financas",
      status: "active",
      plan_id: plan?.id ?? null,
      monthly_amount_cents: 0,
      activated_at: new Date().toISOString(),
    });
    if (productError) return;

    const defaultCategorias = [
      ...EXPENSE_CATEGORIES.map((c, i) => ({
        tenant_id: tenantId,
        type: "despesa" as const,
        name: c.value,
        color: c.color,
        position: i + 1,
      })),
      ...INCOME_CATEGORIES.map((c, i) => ({
        tenant_id: tenantId,
        type: "receita" as const,
        name: c.value,
        color: c.color,
        position: i + 1,
      })),
    ];
    await admin.from("financas_categorias").insert(defaultCategorias);
  } catch {
    // Best-effort — nunca deve derrubar o fluxo de criação do CRM.
  }
}
