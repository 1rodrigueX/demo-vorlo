-- Omnichannel (fase 2c): cada lead (contato) pode ter vários canais conectados
-- (WhatsApp, Instagram, Facebook, Telegram, Messenger, Email, SMS). Por ora só
-- o WhatsApp tem mensagens de verdade; os outros canais entram na fase de
-- integrações (API oficial da Meta etc.). Esta migration cria a estrutura +
-- o campo `channel` nas mensagens pra timeline saber separar por canal.

create table public.lead_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  -- "lead" = contato do CRM.
  contact_id uuid not null references public.contacts (id) on delete cascade,
  channel text not null check (channel in (
    'whatsapp', 'instagram', 'facebook', 'telegram', 'messenger', 'email', 'sms'
  )),
  external_id text,
  username text,
  phone text,
  avatar text,
  connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, channel)
);

create index lead_channels_contact_idx on public.lead_channels (contact_id);
create index lead_channels_tenant_idx on public.lead_channels (tenant_id);

alter table public.lead_channels enable row level security;

-- Visibilidade/edição espelham o contato relacionado (mesmo padrão de
-- contact_tags): dono do contato ou admin. Integrações escrevem via service
-- role (bypassa RLS).
create policy "lead_channels_select_via_contact"
  on public.lead_channels for select to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = lead_channels.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "lead_channels_insert_via_contact"
  on public.lead_channels for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.contacts c
      where c.id = lead_channels.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "lead_channels_update_via_contact"
  on public.lead_channels for update to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = lead_channels.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  )
  with check (tenant_id = public.current_tenant_id());

create policy "lead_channels_delete_via_contact"
  on public.lead_channels for delete to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = lead_channels.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Canal na mensagem: toda mensagem passa a saber de qual canal veio, pra
-- timeline filtrar. Tudo que existe hoje é WhatsApp, então o default já
-- classifica o histórico corretamente.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.whatsapp_messages
  add column channel text not null default 'whatsapp'
  check (channel in ('whatsapp', 'instagram', 'facebook', 'telegram', 'messenger', 'email', 'sms'));

-- Backfill: todo contato com telefone ganha o canal WhatsApp já conectado.
insert into public.lead_channels (tenant_id, contact_id, channel, phone, connected)
  select tenant_id, id, 'whatsapp', phone, true
  from public.contacts
  where phone is not null and tenant_id is not null
  on conflict (contact_id, channel) do nothing;
