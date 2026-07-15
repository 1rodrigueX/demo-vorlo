-- Deixa o dev "abrir" qualquer CRM permanecendo logado como ele mesmo (em vez
-- de trocar de sessão pro dono). dev_active_view guarda qual tenant o dev está
-- visualizando agora; current_tenant_id() e is_admin() passam a considerar
-- isso automaticamente — nenhuma policy das migrations 0005/0006 precisa
-- mudar, porque todas já são construídas em cima dessas duas funções.
create table public.dev_active_view (
  dev_id uuid primary key references public.dev_users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.dev_active_view enable row level security;

create policy "dev_active_view_select_own"
  on public.dev_active_view for select to authenticated
  using (dev_id = auth.uid());

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select tenant_id from public.profiles where id = auth.uid()),
    (select tenant_id from public.dev_active_view where dev_id = auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'manager'))
    or public.is_dev();
$$;
