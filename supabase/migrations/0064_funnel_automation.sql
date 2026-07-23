-- Automações de funil (Fase 1): follow-up de proposta, tag/coluna de
-- fechamento, coluna de inativos e mensagem de venda ganha.
--
-- Reusa a fila genérica automation_jobs (ver 0046_automation_core) + o cron
-- run-automations, só adicionando novos job_type. Nenhuma infra nova.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Novos tipos de job na fila.
--    O CHECK original (0046) só permitia 'lead_webhook_welcome'.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.automation_jobs
  drop constraint automation_jobs_job_type_check;

alter table public.automation_jobs
  add constraint automation_jobs_job_type_check
  check (job_type in (
    'lead_webhook_welcome',
    'proposal_followup',   -- follow-up X horas após proposta enviada
    'inactive_check',      -- checa se o lead respondeu ao follow-up
    'deal_won_message'     -- mensagem automática ao marcar venda ganha
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Novas colunas do pipeline para cada tenant existente (idempotente):
--    "Fechamento" logo depois de "Proposta" e "Inativo" no fim.
--    Ordem final: Atendimento SDR -> Qualificado -> Não Qualificado ->
--    Proposta -> Fechamento -> Fechado -> Inativo.
--    Nenhuma das duas é is_won/is_lost — são etapas abertas do funil.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  t record;
  v_proposta_pos int;
  v_max_pos int;
begin
  for t in select id from public.tenants loop
    -- Fechamento: entra logo após "Proposta", empurrando o resto uma posição.
    if not exists (
      select 1 from public.pipeline_stages
      where tenant_id = t.id and lower(name) = 'fechamento'
    ) then
      select position into v_proposta_pos from public.pipeline_stages
        where tenant_id = t.id and lower(name) = 'proposta'
        order by position limit 1;

      if v_proposta_pos is not null then
        update public.pipeline_stages
          set position = position + 1
          where tenant_id = t.id and position > v_proposta_pos;

        insert into public.pipeline_stages (tenant_id, name, position, color, is_won, is_lost)
          values (t.id, 'Fechamento', v_proposta_pos + 1, '#a855f7', false, false);
      else
        -- Tenant sem "Proposta" (customizou o funil): joga no fim.
        select coalesce(max(position), 0) into v_max_pos
          from public.pipeline_stages where tenant_id = t.id;
        insert into public.pipeline_stages (tenant_id, name, position, color, is_won, is_lost)
          values (t.id, 'Fechamento', v_max_pos + 1, '#a855f7', false, false);
      end if;
    end if;

    -- Inativo: sempre no fim do funil.
    if not exists (
      select 1 from public.pipeline_stages
      where tenant_id = t.id and lower(name) = 'inativo'
    ) then
      select coalesce(max(position), 0) into v_max_pos
        from public.pipeline_stages where tenant_id = t.id;
      insert into public.pipeline_stages (tenant_id, name, position, color, is_won, is_lost)
        values (t.id, 'Inativo', v_max_pos + 1, '#64748b', false, false);
    end if;

    v_proposta_pos := null;
    v_max_pos := null;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) Configuração por tenant das automações de funil. Um registro por
--    tenant; se não existir, o código usa os mesmos defaults abaixo
--    (ver src/lib/automations/funnel.ts). Textos e prazos são editáveis
--    na tela de Configurações.
-- ─────────────────────────────────────────────────────────────────────────
create table public.funnel_automation_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  enabled boolean not null default true,
  followup_delay_hours int not null default 48,
  followup_message text not null default
    'Olá {nome}! Passando pra saber se você conseguiu analisar nossa proposta. Posso te ajudar com alguma dúvida pra seguirmos com o fechamento? 😊',
  followup_tag_name text not null default 'Follow UP de fechamento',
  inactive_delay_hours int not null default 12,
  inactive_tag_name text not null default 'Cliente inativo',
  won_message_enabled boolean not null default true,
  won_message text not null default
    'Pedido recebido e encaminhado para produção, obrigado pela preferência!',
  updated_at timestamptz not null default now()
);

alter table public.funnel_automation_settings enable row level security;

-- Qualquer membro do tenant lê (pra mostrar na config); só admin edita.
create policy "funnel_automation_settings_select_own_tenant"
  on public.funnel_automation_settings for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "funnel_automation_settings_insert_admin"
  on public.funnel_automation_settings for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "funnel_automation_settings_update_admin"
  on public.funnel_automation_settings for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

-- Semeia um registro com os defaults para cada tenant já existente.
insert into public.funnel_automation_settings (tenant_id)
  select id from public.tenants
  on conflict (tenant_id) do nothing;
