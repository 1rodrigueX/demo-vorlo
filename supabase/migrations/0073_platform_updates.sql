-- Comunicados de atualização da plataforma: o time Synexa escreve uma novidade
-- no painel dev e ela vai por e-mail pra todo mundo que tem cadastro — inclusive
-- quem nunca acessou (a lista sai de auth.users, não de profiles).
--
-- Não é tabela por tenant: é comunicado da plataforma inteira, então não tem
-- tenant_id e o acesso é só de dev (public.is_dev(), ver 0005_multi_tenant).

create table public.platform_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Opcional: "v2.4" aparece como selo no e-mail.
  version text,
  body text not null,
  cta_label text,
  cta_url text,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  recipients_total int not null default 0,
  recipients_sent int not null default 0,
  recipients_failed int not null default 0,
  error text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index platform_updates_created_idx on public.platform_updates (created_at desc);

alter table public.platform_updates enable row level security;

create policy "platform_updates_select_dev"
  on public.platform_updates for select to authenticated
  using (public.is_dev());

create policy "platform_updates_insert_dev"
  on public.platform_updates for insert to authenticated
  with check (public.is_dev());

create policy "platform_updates_update_dev"
  on public.platform_updates for update to authenticated
  using (public.is_dev())
  with check (public.is_dev());

create policy "platform_updates_delete_dev"
  on public.platform_updates for delete to authenticated
  using (public.is_dev());

-- ─────────────────────────────────────────────────────────────────────────
-- Descadastro. Obrigatório em e-mail em massa (LGPD e regra de qualquer
-- provedor de envio) — sem isso o domínio da Synexa vira spam e os e-mails
-- transacionais de cobrança param de chegar junto.
--
-- Chaveada por e-mail, não por user_id: quem se descadastra pode nem ter
-- conta ativa, e a decisão vale mesmo se a conta for recriada.
-- ─────────────────────────────────────────────────────────────────────────
create table public.platform_email_optouts (
  email text primary key,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.platform_email_optouts enable row level security;

-- Só dev lê. Quem escreve é a rota pública de descadastro, via service role
-- (o link do e-mail não tem sessão).
create policy "platform_email_optouts_select_dev"
  on public.platform_email_optouts for select to authenticated
  using (public.is_dev());
