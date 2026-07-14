-- Isolamento de dados por vendedor: cada um só vê seus próprios contatos,
-- conversas de WhatsApp, atividades e negócios. O papel 'admin' continua
-- vendo tudo. Também adiciona o campo de "proposta enviada" nos negócios.

alter table public.profiles
  add column role text not null default 'member' check (role in ('admin', 'member'));

update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'danilloa035@gmail.com');

alter table public.deals
  add column proposal_sent_at timestamptz;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- contacts
-- ─────────────────────────────────────────────────────────────────────────
drop policy "contacts_select_authenticated" on public.contacts;
create policy "contacts_select_own_or_admin"
  on public.contacts for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy "contacts_update_own" on public.contacts;
create policy "contacts_update_own_or_admin"
  on public.contacts for update to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy "contacts_delete_own" on public.contacts;
create policy "contacts_delete_own_or_admin"
  on public.contacts for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- deals
-- ─────────────────────────────────────────────────────────────────────────
drop policy "deals_select_authenticated" on public.deals;
create policy "deals_select_own_or_admin"
  on public.deals for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy "deals_update_own" on public.deals;
create policy "deals_update_own_or_admin"
  on public.deals for update to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy "deals_delete_own" on public.deals;
create policy "deals_delete_own_or_admin"
  on public.deals for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- whatsapp_messages (segue o dono do contato vinculado)
-- ─────────────────────────────────────────────────────────────────────────
drop policy "whatsapp_messages_select_authenticated" on public.whatsapp_messages;
create policy "whatsapp_messages_select_own_or_admin"
  on public.whatsapp_messages for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.contacts c
      where c.id = whatsapp_messages.contact_id and c.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- activities (segue o dono do contato vinculado)
-- ─────────────────────────────────────────────────────────────────────────
drop policy "activities_select_authenticated" on public.activities;
create policy "activities_select_own_or_admin"
  on public.activities for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.contacts c
      where c.id = activities.contact_id and c.created_by = auth.uid()
    )
  );

drop policy "activities_update_own" on public.activities;
create policy "activities_update_own_or_admin"
  on public.activities for update to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy "activities_delete_own" on public.activities;
create policy "activities_delete_own_or_admin"
  on public.activities for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
