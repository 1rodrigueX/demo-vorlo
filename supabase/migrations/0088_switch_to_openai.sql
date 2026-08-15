-- Troca do provedor de IA: Anthropic -> OpenAI (decisão do dono).
--
-- Toda a camada de IA passou a falar com a OpenAI (gpt-5.6-terra por padrão):
-- os agentes (Vorlo, SDR, atendente...), o resumo de lead, o gerador de
-- trajetórias e o redator de comunicados do /dev.
--
-- IMPORTANTE — as chaves antigas NÃO são reaproveitáveis: uma chave
-- `sk-ant-...` da Anthropic não autentica na OpenAI. Por isso esta migration
-- LIMPA as credenciais em vez de tentar migrá-las. Depois de aplicar, é
-- preciso colar uma chave nova da OpenAI em dois lugares:
--   - /dev/ia                                  (chave da plataforma, banca o Vorlo)
--   - Configurações > Inteligência Artificial  (chave de cada tenant, banca SDR etc.)
-- Enquanto isso não for feito, os agentes ficam sem responder — exatamente
-- como já estavam com a chave inválida da Anthropic.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Chave da plataforma (linha única) — renomeia a coluna e zera o valor,
--    que era uma chave da Anthropic e não serve mais.
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'platform_ai_config' and column_name = 'anthropic_api_key'
  ) and not exists (
    select 1 from information_schema.columns
    where table_name = 'platform_ai_config' and column_name = 'openai_api_key'
  ) then
    alter table public.platform_ai_config rename column anthropic_api_key to openai_api_key;
  end if;
end $$;

update public.platform_ai_config
set openai_api_key = null,
    status = 'disconnected',
    connected_at = null,
    last_tested_at = null,
    last_error = null,
    updated_at = now()
where openai_api_key is not null or status <> 'disconnected';

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Chave por tenant — o check de `provider` só aceitava 'anthropic'.
--    Passa a aceitar 'openai' (mantém 'anthropic' na lista pra não quebrar
--    caso sobre alguma linha histórica em outro ambiente).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.tenant_integrations drop constraint if exists tenant_integrations_provider_check;
alter table public.tenant_integrations add constraint tenant_integrations_provider_check
  check (provider in ('openai', 'anthropic', 'gmail', 'outlook', 'google_calendar', 'microsoft365', 'custom'));

-- As linhas 'anthropic' guardam uma chave que não autentica mais em lugar
-- nenhum — apaga em vez de deixar lixo cifrado no banco. A tela de
-- Integrações volta a mostrar "Desconectada", pedindo a chave nova.
delete from public.tenant_integrations where provider = 'anthropic';

-- ─────────────────────────────────────────────────────────────────────────
-- 3) Modelo salvo em cada agente. Todo agente existente aponta pra um modelo
--    da Anthropic (claude-*), que a OpenAI rejeitaria com 404.
-- ─────────────────────────────────────────────────────────────────────────
update public.ai_agents
set model = 'gpt-5.6-terra', updated_at = now()
where model like 'claude-%';

-- Novos tenants: o Vorlo é criado pelo trigger handle_new_tenant(), que não
-- define `model` explicitamente — ele vem do DEFAULT da coluna, que ainda
-- apontava pra um modelo da Anthropic.
alter table public.ai_agents alter column model set default 'gpt-5.6-terra';

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Chave opcional coletada no checkout (staging). Mesma história: o que
--    estava lá era chave da Anthropic e não serve mais.
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'pending_checkouts' and column_name = 'anthropic_api_key')
     and not exists (select 1 from information_schema.columns
                     where table_name = 'pending_checkouts' and column_name = 'openai_api_key')
  then
    alter table public.pending_checkouts rename column anthropic_api_key to openai_api_key;
  end if;
end $$;

update public.pending_checkouts set openai_api_key = null where openai_api_key is not null;
