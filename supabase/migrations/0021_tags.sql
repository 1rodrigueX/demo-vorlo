-- Sistema de tags geral (não é só pra Bling — serve pra segmentar contatos
-- de qualquer jeito no futuro). Cada tenant tem seu próprio conjunto.
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create unique index tags_tenant_name_idx on public.tags (tenant_id, lower(name));
create index tags_tenant_idx on public.tags (tenant_id);

alter table public.tags enable row level security;

-- Qualquer membro do tenant vê as tags (precisa pra filtrar/atribuir); só
-- admin cria/edita/apaga a definição da tag em si.
create policy "tags_select_own_tenant"
  on public.tags for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "tags_insert_admin"
  on public.tags for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "tags_update_admin"
  on public.tags for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

create policy "tags_delete_admin"
  on public.tags for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

-- Relação N:N entre contatos e tags.
create table public.contact_tags (
  contact_id uuid not null references public.contacts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create index contact_tags_tag_idx on public.contact_tags (tag_id);

alter table public.contact_tags enable row level security;

-- Visibilidade/edição espelha a do contato relacionado (mesmo padrão de
-- contact_attachments): dono do contato ou admin.
create policy "contact_tags_select_via_contact"
  on public.contact_tags for select to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_tags.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "contact_tags_insert_via_contact"
  on public.contact_tags for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.contacts c
      where c.id = contact_tags.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "contact_tags_delete_via_contact"
  on public.contact_tags for delete to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_tags.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );
