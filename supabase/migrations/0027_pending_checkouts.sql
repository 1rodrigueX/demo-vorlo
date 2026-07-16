-- Staging da intenção de compra entre "usuário clicou pagar" e "webhook do
-- Stripe confirmou o pagamento". Guarda tudo que o provisionamento precisa
-- (incluindo a chave da Anthropic, se o usuário colou uma) fora do Stripe
-- metadata (não é lugar pra segredo, fica visível no dashboard do Stripe) e
-- fora do user_metadata do Supabase (vira claim do JWT do próprio usuário,
-- legível no navegador — pior ainda pra um segredo). Só o service role toca
-- aqui (sem policy nenhuma), igual ao padrão de stripe_webhook_events.
--
-- O índice único parcial em (user_id) where status='pending' impede duas
-- assinaturas simultâneas do mesmo usuário (F5, duplo clique, duas abas);
-- /choose-plan limpa linhas "pending" velhas (checkout abandonado) antes de
-- deixar tentar de novo.
create table public.pending_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  company_name text not null,
  plan_id uuid not null references public.billing_plans (id),
  extra_sellers int not null default 0,
  extra_managers int not null default 0,
  extra_agents int not null default 0,
  extra_integrations int not null default 0,
  anthropic_api_key text,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

create unique index pending_checkouts_one_pending_per_user
  on public.pending_checkouts (user_id) where status = 'pending';

alter table public.pending_checkouts enable row level security;
