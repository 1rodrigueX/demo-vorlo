-- Completa o que a migration 0064_funnel_automation.sql deveria ter feito e
-- nunca terminou de aplicar em produção — confirmado por introspecção:
-- funnel_automation_settings não existe (to_regclass retorna null) e nenhum
-- tenant pré-existente tem as etapas "Fechamento"/"Inativo" no pipeline,
-- mesmo a migration datando de bem antes desta sessão. O ajuste na
-- constraint automation_jobs_job_type_check (parte 1 de 0064) chegou a
-- aplicar; o resto (parte 2 em diante) não. Não há como saber ao certo por
-- que parou no meio — o mais provável é falha no meio de uma aplicação
-- manual (fora do fluxo `supabase migration up`; supabase_migrations.
-- schema_migrations só tem registro até 0030).
--
-- Efeito prático do buraco: getFunnelSettings() já caía com segurança nos
-- defaults hardcoded (a tabela sumida vira {data:null,error} no shim, não
-- exceção — automação de funil sempre funcionou com os valores padrão) —
-- mas saveFunnelSettings() (tela Configurações > Automações) sempre falhava
-- com uma mensagem enganosa ("só administradores podem editar"), quando o
-- problema real era a tabela não existir. E o passo "mover pra
-- Fechamento/Inativo" das automações de follow-up/inatividade virava no-op
-- silencioso pra quem não tem essas etapas (moveDealToStageByName só
-- encontra a etapa se ela existir).
--
-- Idempotente de propósito (if not exists / on conflict do nothing) — seguro
-- de rodar mesmo que outro ambiente já tenha uma parte disso aplicada.

create table if not exists public.funnel_automation_settings (
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

drop policy if exists "funnel_automation_settings_select_own_tenant" on public.funnel_automation_settings;
create policy "funnel_automation_settings_select_own_tenant"
  on public.funnel_automation_settings for select to authenticated
  using (tenant_id = public.current_tenant_id(null::uuid));

drop policy if exists "funnel_automation_settings_insert_admin" on public.funnel_automation_settings;
create policy "funnel_automation_settings_insert_admin"
  on public.funnel_automation_settings for insert to authenticated
  with check (tenant_id = public.current_tenant_id(null::uuid) and public.is_admin());

drop policy if exists "funnel_automation_settings_update_admin" on public.funnel_automation_settings;
create policy "funnel_automation_settings_update_admin"
  on public.funnel_automation_settings for update to authenticated
  using (tenant_id = public.current_tenant_id(null::uuid) and public.is_admin())
  with check (tenant_id = public.current_tenant_id(null::uuid));

insert into public.funnel_automation_settings (tenant_id)
  select id from public.tenants
  on conflict (tenant_id) do nothing;

-- Backfill das etapas "Fechamento" (logo após "Proposta") e "Inativo"
-- (sempre no fim) pra tenants que ainda não têm — mesma lógica de 0064.
do $$
declare
  t record;
  v_proposta_pos int;
  v_max_pos int;
begin
  for t in select id from public.tenants loop
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
        select coalesce(max(position), 0) into v_max_pos
          from public.pipeline_stages where tenant_id = t.id;
        insert into public.pipeline_stages (tenant_id, name, position, color, is_won, is_lost)
          values (t.id, 'Fechamento', v_max_pos + 1, '#a855f7', false, false);
      end if;
    end if;

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
