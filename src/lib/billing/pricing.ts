import type { BillingPlan } from "@/types/domain";

export type PlanSelection = {
  extraSellers: number;
  extraManagers: number;
  extraAgents: number;
  extraIntegrations: number;
};

export type PriceBreakdown = {
  basePriceCents: number;
  extraSellersCents: number;
  extraManagersCents: number;
  extraAgentsCents: number;
  extraIntegrationsCents: number;
  totalCents: number;
};

/** Calcula o preço mensal a partir do plano base + itens extras selecionados (checkout ou uso real do tenant). */
export function calculateTotalCents(plan: BillingPlan, selection: PlanSelection): PriceBreakdown {
  const extraSellersCents = selection.extraSellers * plan.price_per_extra_seller_cents;
  const extraManagersCents = selection.extraManagers * plan.price_per_extra_manager_cents;
  const extraAgentsCents = selection.extraAgents * plan.price_per_agent_cents;
  const extraIntegrationsCents = selection.extraIntegrations * plan.price_per_integration_cents;

  return {
    basePriceCents: plan.base_price_cents,
    extraSellersCents,
    extraManagersCents,
    extraAgentsCents,
    extraIntegrationsCents,
    totalCents: plan.base_price_cents + extraSellersCents + extraManagersCents + extraAgentsCents + extraIntegrationsCents,
  };
}

export function formatCentsBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
