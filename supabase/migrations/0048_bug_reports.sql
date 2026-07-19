-- Reports de bug — mesmo espírito de suggestions/platform_feedback (0036,
-- 0041), com um campo a mais (severity) porque bug tem urgência, sugestão
-- não. Alimenta o painel dev (/dev/bugs) e o bot do Discord.
create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text,
  message text not null,
  severity text not null default 'media' check (severity in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'new' check (status in ('new', 'answered')),
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index bug_reports_tenant_idx on public.bug_reports (tenant_id, created_at desc);

alter table public.bug_reports enable row level security;

create policy "bug_reports_select_own_tenant"
  on public.bug_reports for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "bug_reports_insert_own_tenant"
  on public.bug_reports for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and created_by = auth.uid());
