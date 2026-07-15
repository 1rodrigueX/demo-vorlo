-- Suporte a "Cc" no compose de e-mail (lista separada por vírgula).
alter table public.email_messages
  add column cc_address text;
