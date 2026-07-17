-- Feedback de quem ainda não é cliente (mandado na aba "Feedback" da tela
-- pós-cadastro, antes de escolher um plano) — não tem tenant_id porque esse
-- usuário ainda não tem tenant. Revisado pelo dev em /dev/feedback, mesmo
-- padrão de suggestions.
create table public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'answered')),
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.platform_feedback enable row level security;

create policy "platform_feedback_insert_authenticated"
  on public.platform_feedback for insert to authenticated
  with check (true);
