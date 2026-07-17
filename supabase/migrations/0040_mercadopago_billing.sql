-- Troca do Stripe pelo Mercado Pago. Sem clientes reais até agora, então é
-- substituição direta (sem coluna dupla nem migração de dados de assinatura).
--
-- O Mercado Pago não tem cobrança automática recorrente aceitando PIX/boleto
-- (só cartão via Preapproval) — por isso vira cobrança manual por ciclo: todo
-- mês o cron (src/app/api/cron/billing-cycle) gera uma Preference nova por
-- tenant usando monthly_amount_cents (congelado no valor calculado no
-- checkout, não recalculado se billing_plans mudar depois) e manda por
-- e-mail. tenants.status ganha 'past_due' como um estado intermediário antes
-- da suspensão de verdade (grace period de alguns dias, ver o cron).

alter table public.tenants drop constraint tenants_status_check;
alter table public.tenants
  add constraint tenants_status_check check (status in ('active', 'past_due', 'suspended')),
  drop column stripe_customer_id,
  drop column stripe_subscription_id,
  add column mp_payer_id text,
  add column last_payment_id text,
  add column monthly_amount_cents int,
  add column next_billing_at timestamptz,
  add column pending_payment_url text;

alter table public.pending_checkouts rename column stripe_session_id to mp_preference_id;

drop table public.stripe_webhook_events;

-- Idempotência do webhook do Mercado Pago: cada pagamento só é processado
-- uma vez (a própria PK previne reprocessar em reentregas). Sem policy
-- nenhuma — só o service role (webhook) toca aqui, nunca o app com sessão de
-- usuário. Mesmo padrão de stripe_webhook_events.
create table public.mercadopago_webhook_events (
  id text primary key,
  created_at timestamptz not null default now()
);

alter table public.mercadopago_webhook_events enable row level security;

-- Preços cadastrados em USD viram os mesmos números em BRL, na cotação de
-- 17/07/2026 (~R$5,10). É uma conversão única — ajuste manual depois se quiser
-- outros valores.
update public.billing_plans set
  base_price_cents = round(base_price_cents * 5.10),
  price_per_extra_seller_cents = round(price_per_extra_seller_cents * 5.10),
  price_per_extra_manager_cents = round(price_per_extra_manager_cents * 5.10),
  price_per_agent_cents = round(price_per_agent_cents * 5.10),
  price_per_integration_cents = round(price_per_integration_cents * 5.10);
