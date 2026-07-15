-- Bucket compartilhado pra mídia enviada/recebida em mensagens (WhatsApp e
-- e-mail) — separado do contact-attachments (que é só PDF de proposta),
-- aceita qualquer tipo de arquivo. Acesso sempre mediado por Server
-- Action/rota com service role, sem policies de storage.objects (mesmo
-- padrão do contact-attachments).
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

alter table public.whatsapp_messages
  add column media_storage_path text,
  add column media_content_type text,
  add column media_file_name text;

alter table public.email_messages
  add column attachments jsonb not null default '[]'::jsonb;
