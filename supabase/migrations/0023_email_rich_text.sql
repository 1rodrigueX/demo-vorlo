-- Suporte a rich text no canal de e-mail: guarda o HTML sanitizado ao lado
-- do texto puro em `body` (que continua servindo de preview/fallback).
alter table public.email_messages
  add column body_html text;
