-- Config do bot do Discord — plataforma inteira, não por tenant (por isso o
-- truque de linha única: id boolean com check garante que só existe UMA
-- linha possível). Antes ficava em variável de ambiente da VPS; agora dá
-- pra editar direto pelo painel dev (/dev/discord), sem precisar de SSH.
create table public.platform_discord_config (
  id boolean primary key default true check (id),
  bot_token text,
  public_key text,
  application_id text,
  log_channel_id text,
  updated_at timestamptz not null default now()
);

alter table public.platform_discord_config enable row level security;

create policy "platform_discord_config_select_dev"
  on public.platform_discord_config for select to authenticated
  using (public.is_dev());

-- Sem policy de insert/update pra authenticated — a escrita passa pela
-- server action (saveDiscordConfig), que já confere is_dev() e usa o
-- service role, mesmo padrão de createTenant/respondToSuggestion etc.
