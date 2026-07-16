-- Troca o plano único ("Plano Padrão" + add-ons) por 3 tiers fechados que o
-- usuário escolhe em /choose-plan (Starter/Pro/Enterprise). Os valores abaixo
-- são placeholder — ajustar preço/limites reais antes do lançamento, direto
-- nesta tabela (não tem lógica de código dependendo dos números em si, só
-- das colunas). Mantém só um is_default=true (índice único parcial já
-- existente em billing_plans_single_default_idx garante isso) pra marcar o
-- tier "recomendado" nos cards da landing/choose-plan.

-- "Plano Padrão" vira o tier Pro (mantém o mesmo id — evita quebrar
-- tenants.billing_plan_id de quem já assinou por esse plano).
update public.billing_plans
set
  name = 'Pro',
  base_price_cents = 7900,
  included_sellers = 5,
  included_managers = 2,
  included_agents = 2,
  price_per_extra_seller_cents = 600,
  price_per_extra_manager_cents = 1000,
  price_per_agent_cents = 1200,
  price_per_integration_cents = 2000
where is_default = true;

insert into public.billing_plans (
  name, is_default, base_price_cents, included_sellers, included_managers, included_agents,
  price_per_extra_seller_cents, price_per_extra_manager_cents, price_per_agent_cents, price_per_integration_cents
) values
  ('Starter', false, 2900, 2, 1, 1, 800, 1200, 1500, 2500),
  ('Enterprise', false, 19900, 15, 5, 5, 400, 800, 1000, 1500);
