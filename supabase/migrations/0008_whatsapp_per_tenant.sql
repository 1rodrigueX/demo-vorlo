-- WhatsApp deixa de ser uma conexão global (env vars) e vira uma escolha por
-- tenant: cada CRM guarda seu próprio provider (Baileys via QR code, ou
-- Twilio com credenciais próprias).
create table public.whatsapp_connections (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  provider text not null default 'baileys' check (provider in ('baileys', 'twilio')),
  twilio_account_sid text,
  twilio_auth_token text,
  twilio_whatsapp_number text,
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_connections enable row level security;

create policy "whatsapp_connections_select_own"
  on public.whatsapp_connections for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "whatsapp_connections_update_own_admin"
  on public.whatsapp_connections for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

-- Cria a linha automaticamente pra todo tenant novo (dono não precisa
-- descobrir que precisa "ativar" WhatsApp — já vem com Baileys como padrão,
-- igual ao comportamento de hoje).
create or replace function public.handle_new_tenant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.whatsapp_connections (tenant_id) values (new.id);
  return new;
end;
$$;

create trigger on_tenant_created
  after insert on public.tenants
  for each row execute function public.handle_new_tenant();

-- Backfill pros tenants que já existem (hoje, só a Nyplastic).
insert into public.whatsapp_connections (tenant_id, provider)
select id, 'baileys' from public.tenants
on conflict (tenant_id) do nothing;
