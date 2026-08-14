-- CRÍTICO: desde a migração pro Auth.js (~2026-08-07), novos usuários são
-- gravados só em public.app_users — auth.users (tabela do Supabase Auth
-- antigo) nunca mais recebe um INSERT. Só que ~25 tabelas ainda têm FK
-- apontando pra auth.users, incluindo profiles.id e as 3 tabelas de staging
-- de checkout (pending_checkouts, transportadora_pending_checkouts,
-- module_pending_checkouts) — ou seja, desde então NENHUM cadastro novo
-- funciona nesta plataforma: criar profile pra um usuário novo, ou iniciar
-- qualquer checkout pago (CRM, Transportadora, módulo add-on) falha na hora
-- com violação de FK. Confirmado com um cliente real cadastrado ontem
-- (sem profile, sem tenant, conta inutilizável).
--
-- Repointa cada uma pra public.app_users(id), que é o que o Auth.js
-- realmente popula agora. NOT VALID em todas (não escaneia/trava a tabela
-- pra validar linhas antigas — só passa a valer pra escritas novas; existe
-- pelo menos 1 linha de checkout abandonada pré-corte que não teria um
-- app_users correspondente, então validar a existente quebraria a migration
-- à toa por causa de lixo de teste antigo).

alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references public.app_users (id) on delete cascade not valid;

alter table public.whatsapp_messages drop constraint whatsapp_messages_sent_by_fkey;
alter table public.whatsapp_messages add constraint whatsapp_messages_sent_by_fkey
  foreign key (sent_by) references public.app_users (id) not valid;

alter table public.chat_messages drop constraint chat_messages_user_id_fkey;
alter table public.chat_messages add constraint chat_messages_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade not valid;

alter table public.dev_users drop constraint dev_users_id_fkey;
alter table public.dev_users add constraint dev_users_id_fkey
  foreign key (id) references public.app_users (id) on delete cascade not valid;

alter table public.ai_agents drop constraint ai_agents_created_by_fkey;
alter table public.ai_agents add constraint ai_agents_created_by_fkey
  foreign key (created_by) references public.app_users (id) on delete set null not valid;

alter table public.ai_agent_messages drop constraint ai_agent_messages_user_id_fkey;
alter table public.ai_agent_messages add constraint ai_agent_messages_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade not valid;

alter table public.ai_agent_logs drop constraint ai_agent_logs_user_id_fkey;
alter table public.ai_agent_logs add constraint ai_agent_logs_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete set null not valid;

alter table public.email_messages drop constraint email_messages_sent_by_fkey;
alter table public.email_messages add constraint email_messages_sent_by_fkey
  foreign key (sent_by) references public.app_users (id) not valid;

alter table public.tenant_api_keys drop constraint tenant_api_keys_created_by_fkey;
alter table public.tenant_api_keys add constraint tenant_api_keys_created_by_fkey
  foreign key (created_by) references public.app_users (id) on delete set null not valid;

alter table public.pending_checkouts drop constraint pending_checkouts_user_id_fkey;
alter table public.pending_checkouts add constraint pending_checkouts_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade not valid;

alter table public.suggestions drop constraint suggestions_created_by_fkey;
alter table public.suggestions add constraint suggestions_created_by_fkey
  foreign key (created_by) references public.app_users (id) on delete set null not valid;

alter table public.platform_feedback drop constraint platform_feedback_user_id_fkey;
alter table public.platform_feedback add constraint platform_feedback_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete set null not valid;

alter table public.transportadora_pending_checkouts drop constraint transportadora_pending_checkouts_user_id_fkey;
alter table public.transportadora_pending_checkouts add constraint transportadora_pending_checkouts_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade not valid;

alter table public.lead_webhooks drop constraint lead_webhooks_created_by_fkey;
alter table public.lead_webhooks add constraint lead_webhooks_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;

alter table public.financas_lancamentos drop constraint financas_lancamentos_created_by_fkey;
alter table public.financas_lancamentos add constraint financas_lancamentos_created_by_fkey
  foreign key (created_by) references public.app_users (id) on delete set null not valid;

alter table public.estoque_movimentacoes drop constraint estoque_movimentacoes_created_by_fkey;
alter table public.estoque_movimentacoes add constraint estoque_movimentacoes_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;

alter table public.producao_funcionarios drop constraint producao_funcionarios_id_fkey;
alter table public.producao_funcionarios add constraint producao_funcionarios_id_fkey
  foreign key (id) references public.app_users (id) on delete cascade not valid;

alter table public.producao_apontamentos drop constraint producao_apontamentos_created_by_fkey;
alter table public.producao_apontamentos add constraint producao_apontamentos_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;

alter table public.module_pending_checkouts drop constraint module_pending_checkouts_user_id_fkey;
alter table public.module_pending_checkouts add constraint module_pending_checkouts_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade not valid;

alter table public.automation_flows drop constraint automation_flows_created_by_fkey;
alter table public.automation_flows add constraint automation_flows_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;

alter table public.contact_merges drop constraint contact_merges_merged_by_fkey;
alter table public.contact_merges add constraint contact_merges_merged_by_fkey
  foreign key (merged_by) references public.app_users (id) not valid;

alter table public.kommo_imports drop constraint kommo_imports_created_by_fkey;
alter table public.kommo_imports add constraint kommo_imports_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;

alter table public.platform_updates drop constraint platform_updates_created_by_fkey;
alter table public.platform_updates add constraint platform_updates_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;

alter table public.campaigns drop constraint campaigns_created_by_fkey;
alter table public.campaigns add constraint campaigns_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;

alter table public.app_releases drop constraint app_releases_created_by_fkey;
alter table public.app_releases add constraint app_releases_created_by_fkey
  foreign key (created_by) references public.app_users (id) not valid;
