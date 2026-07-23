-- Tarefas do lead (omnichannel, fase Leads premium): cada lead (contato) pode
-- ter tarefas com prazo e status de conclusão — usadas na coluna direita da
-- tela de Leads ("Tarefas + Nova tarefa"). Notas e Atividades reaproveitam a
-- tabela `activities` (type='note' etc.), então só Tarefas precisa de tabela
-- nova. RLS espelha o contato relacionado (mesmo padrão de lead_channels).

create table public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lead_tasks_contact_idx on public.lead_tasks (contact_id);
create index lead_tasks_tenant_idx on public.lead_tasks (tenant_id);

alter table public.lead_tasks enable row level security;

create policy "lead_tasks_select_via_contact"
  on public.lead_tasks for select to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = lead_tasks.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "lead_tasks_insert_via_contact"
  on public.lead_tasks for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.contacts c
      where c.id = lead_tasks.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "lead_tasks_update_via_contact"
  on public.lead_tasks for update to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = lead_tasks.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  )
  with check (tenant_id = public.current_tenant_id());

create policy "lead_tasks_delete_via_contact"
  on public.lead_tasks for delete to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = lead_tasks.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );
