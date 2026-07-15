-- sent_by apontava pra profiles(id), mas um dev "visitando" um tenant
-- (dev_active_view) não tem linha em profiles — só existe em auth.users.
-- Qualquer envio (e-mail/WhatsApp) feito nesse modo violava essa FK. Aponta
-- pra auth.users(id), que sempre existe pro usuário autenticado.
alter table public.email_messages drop constraint email_messages_sent_by_fkey;
alter table public.email_messages
  add constraint email_messages_sent_by_fkey foreign key (sent_by) references auth.users (id);

alter table public.whatsapp_messages drop constraint whatsapp_messages_sent_by_fkey;
alter table public.whatsapp_messages
  add constraint whatsapp_messages_sent_by_fkey foreign key (sent_by) references auth.users (id);
