-- Anexos de PDF (propostas etc.) vinculados a um contato. Upload/leitura/
-- exclusão passam sempre pelo server action com o client de service role,
-- depois de checar manualmente que o usuário enxerga o contato via RLS — por
-- isso não há policies de storage.objects aqui (mesmo padrão do admin.ts).
insert into storage.buckets (id, name, public)
values ('contact-attachments', 'contact-attachments', false)
on conflict (id) do nothing;

create table public.contact_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index contact_attachments_contact_id_idx
  on public.contact_attachments (contact_id, created_at desc);

alter table public.contact_attachments enable row level security;

-- Visibilidade espelha a do contato: só quem criou o contato (ou admin) vê
-- os anexos dele.
create policy "contact_attachments_select_via_contact"
  on public.contact_attachments for select to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_attachments.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "contact_attachments_insert_via_contact"
  on public.contact_attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.contacts c
      where c.id = contact_attachments.contact_id
        and c.tenant_id = public.current_tenant_id()
        and (c.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "contact_attachments_delete_own_or_admin"
  on public.contact_attachments for delete to authenticated
  using (tenant_id = public.current_tenant_id() and (uploaded_by = auth.uid() or public.is_admin()));
