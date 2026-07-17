-- Vídeos de tutorial: conteúdo da plataforma (não por tenant), gerenciado só
-- pelo dev via /dev, exibido pra todo mundo na aba Suporte > Vídeos.
create table public.platform_tutorial_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.platform_tutorial_videos enable row level security;

-- Qualquer usuário logado (de qualquer tenant) pode ver — é conteúdo de
-- ajuda da plataforma, não dado de negócio. Escrita só via admin client
-- (painel /dev, mesmo padrão de tenants/is_admin em src/app/dev).
create policy "platform_tutorial_videos_select_authenticated"
  on public.platform_tutorial_videos for select to authenticated
  using (true);

-- Sugestões: qualquer membro do tenant manda, só o dev vê/responde todas
-- (pelo painel /dev). O próprio tenant só vê as suas.
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'answered')),
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index suggestions_tenant_idx on public.suggestions (tenant_id, created_at desc);

alter table public.suggestions enable row level security;

create policy "suggestions_select_own_tenant"
  on public.suggestions for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "suggestions_insert_own_tenant"
  on public.suggestions for insert to authenticated
  with check (tenant_id = public.current_tenant_id());
