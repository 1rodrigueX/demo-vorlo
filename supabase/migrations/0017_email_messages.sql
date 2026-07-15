-- Canal "E-mails": mesma ideia do whatsapp_messages, só que alimentado pelas
-- contas Gmail/Outlook conectadas em Configurações (tenant_integrations).
create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  provider text not null check (provider in ('gmail', 'outlook')),
  external_message_id text not null,
  thread_id text,
  direction text not null check (direction in ('outbound', 'inbound')),
  from_address text not null,
  to_address text not null,
  subject text,
  body text,
  status text not null default 'received' check (status in ('sent', 'failed', 'received')),
  error_message text,
  raw_payload jsonb,
  sent_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Evita duplicar a mesma mensagem numa nova sincronização.
create unique index email_messages_provider_external_id_idx
  on public.email_messages (provider, external_message_id);

create index email_messages_contact_idx on public.email_messages (contact_id, created_at);
create index email_messages_tenant_idx on public.email_messages (tenant_id, created_at desc);

alter table public.email_messages enable row level security;

-- Mesmo padrão de whatsapp_messages: vê quem é admin do tenant, ou dono do
-- contato relacionado.
create policy "email_messages_select_own_or_admin"
  on public.email_messages for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.contacts c
        where c.id = email_messages.contact_id and c.created_by = auth.uid()
      )
    )
  );

create policy "email_messages_insert_own"
  on public.email_messages for insert to authenticated
  with check (sent_by = auth.uid() and tenant_id = public.current_tenant_id());

-- Atividades passam a registrar também o canal "email" (igual ao "whatsapp").
alter table public.activities drop constraint activities_type_check;
alter table public.activities
  add constraint activities_type_check
  check (type in ('note', 'call', 'whatsapp', 'email', 'follow_up', 'stage_change'));

alter table public.activities
  add column email_message_id uuid references public.email_messages (id);

alter publication supabase_realtime add table public.email_messages;
