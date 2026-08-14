-- Chave da API Anthropic que banca o Vorlo (aba Suporte) em todo tenant —
-- plataforma inteira, não por tenant, mesmo truque de linha única de
-- platform_discord_config (0049): id boolean com check garante só 1 linha.
-- Antes só dava pra configurar via PLATFORM_ANTHROPIC_API_KEY na VPS (SSH +
-- redeploy pra trocar); agora dá pra editar direto em /dev/ia. A chave fica
-- cifrada em repouso (mesmo padrão de tenant_integrations.credentials —
-- encryptSecret/decryptSecret, AES-256-GCM), diferente do bot_token do
-- Discord (texto puro) — API key de LLM é mais sensível, vale o cuidado extra.
create table public.platform_ai_config (
  id boolean primary key default true check (id),
  anthropic_api_key text,
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  connected_at timestamptz,
  last_tested_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.platform_ai_config enable row level security;

-- is_dev() puro é ambíguo desde a 0078 (ganhou um overload aditivo
-- is_dev(p_user_id uuid default null), nunca dropou o original) — chama
-- explícito com null::uuid pra desambiguar, mesmo padrão já usado nas
-- migrations do ERP pra current_tenant_has_X(null::uuid).
create policy "platform_ai_config_select_dev"
  on public.platform_ai_config for select to authenticated
  using (public.is_dev(null::uuid));

-- Sem policy de insert/update pra authenticated — a escrita passa pela
-- server action (savePlatformAiConfig), que já confere isCurrentUserDev()
-- e usa o service role, mesmo padrão de platform_discord_config.
