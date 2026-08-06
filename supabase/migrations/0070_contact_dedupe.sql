-- Anti-duplicidade de leads. Até aqui o CRM só comparava `contacts.phone` como
-- string exata (ver findOrCreateContact.ts e o endpoint público de captura), o
-- que deixava passar o mesmo cliente cadastrado como "+5511988887777",
-- "5511988887777" e "(11) 98888-7777". O baileysClient chegou a serializar o
-- import de histórico por tenant só por causa disso ("contacts.phone não tem
-- constraint unique") — a trava agora fica no banco, onde nenhuma corrida entre
-- webhook, importação e cadastro manual consegue furar.
--
-- Duas chaves normalizadas, com pesos diferentes de propósito:
--  - phone_key: UNIQUE por tenant. Num CRM que gira em torno do WhatsApp, um
--    telefone é uma conversa é um lead — findOrCreateContact já parte disso.
--  - email_key: só indexada, NÃO única. E-mail genérico compartilhado
--    (contato@empresa.com em 3 pessoas) é legítimo e travar isso quebraria
--    cadastro de cliente real. Vira "candidato a duplicado" pra revisão humana.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Normalização de telefone
-- ─────────────────────────────────────────────────────────────────────────
-- IMMUTABLE porque é usada em coluna gerada. Consequência: mudar a regra
-- depois NÃO recalcula as linhas existentes — precisa de um backfill
-- explícito (ver a seção 5 desta migration como modelo).
create or replace function public.normalize_phone_br(raw text)
returns text
language plpgsql
immutable
as $$
declare
  trimmed text;
  has_plus boolean;
  digits text;
  local_number text;
  ddd text;
  subscriber text;
begin
  trimmed := btrim(coalesce(raw, ''));
  digits := regexp_replace(trimmed, '\D', '', 'g');
  if digits = '' then
    return null;
  end if;

  -- "+" com DDI diferente de 55: estrangeiro declarado, não mexe. Sem isso um
  -- +1 415 555 2671 (11 dígitos, mesmo tamanho de celular brasileiro com DDD)
  -- seria remontado como se fosse do Brasil.
  has_plus := left(trimmed, 1) = '+';
  if has_plus and left(digits, 2) <> '55' then
    return '+' || digits;
  end if;

  -- Zero de tronco antes do DDD (011 98888-7777) e 00 de discagem internacional.
  if not has_plus then
    digits := regexp_replace(digits, '^0+', '');
    if digits = '' then
      return null;
    end if;
  end if;

  if left(digits, 2) = '55' and length(digits) in (12, 13) then
    -- Já veio com o DDI do Brasil.
    local_number := substr(digits, 3);
  elsif length(digits) in (10, 11) then
    -- Sem DDI: assume Brasil, que é como o vendedor digita no formulário.
    local_number := digits;
  else
    -- Estrangeiro (ou número incompleto): não tenta adivinhar, só padroniza
    -- o formato pra comparação continuar sendo possível.
    return '+' || digits;
  end if;

  ddd := left(local_number, 2);
  subscriber := substr(local_number, 3);

  -- Nono dígito: celular antigo (8 dígitos começando em 6-9) e o mesmo número
  -- já com o 9 na frente são a mesma pessoa. Fixo começa em 2-5 e não tem
  -- nono dígito — fica com 8.
  if length(subscriber) = 8 and left(subscriber, 1) between '6' and '9' then
    subscriber := '9' || subscriber;
  end if;

  return '+55' || ddd || subscriber;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Chaves normalizadas no contato
-- ─────────────────────────────────────────────────────────────────────────
alter table public.contacts
  add column phone_key text generated always as (public.normalize_phone_br(phone)) stored,
  add column email_key text generated always as (lower(nullif(btrim(coalesce(email, '')), ''))) stored;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) Auditoria das mesclagens
--    O contato perdedor deixa de existir, então loser_id é uuid solto (sem FK)
--    e loser_snapshot guarda o registro inteiro — é o que permite reconstruir
--    manualmente um merge feito por engano.
-- ─────────────────────────────────────────────────────────────────────────
create table public.contact_merges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  winner_id uuid not null references public.contacts (id) on delete cascade,
  loser_id uuid not null,
  loser_snapshot jsonb not null,
  reason text not null,
  merged_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index contact_merges_tenant_idx on public.contact_merges (tenant_id, created_at desc);

alter table public.contact_merges enable row level security;

-- Só leitura, e só pra admin: é registro de auditoria, ninguém edita à mão.
-- Quem escreve é a função merge_contacts (security definer).
create policy "contact_merges_select_own_admin"
  on public.contact_merges for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Mesclagem
--    Reaponta tudo que pendura em contact_id pro vencedor, guarda o snapshot,
--    apaga o perdedor e só então completa os campos vazios do vencedor.
--    A ordem importa: apagar antes de copiar o telefone evita colidir com o
--    índice único criado na seção 6 (o perdedor ainda seguraria aquela chave).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.merge_contacts(
  winner_id uuid,
  loser_id uuid,
  reason text default 'manual'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  winner public.contacts;
  loser public.contacts;
begin
  if winner_id = loser_id then
    raise exception 'Não é possível mesclar um contato com ele mesmo';
  end if;

  select * into winner from public.contacts where id = winner_id;
  if not found then
    raise exception 'Contato principal não encontrado';
  end if;

  select * into loser from public.contacts where id = loser_id;
  if not found then
    raise exception 'Contato duplicado não encontrado';
  end if;

  if winner.tenant_id is distinct from loser.tenant_id then
    raise exception 'Contatos de empresas diferentes não podem ser mesclados';
  end if;

  -- auth.uid() nulo = service role ou a própria migration (backfill), que já
  -- roda com escopo controlado. Com usuário logado, a função é security
  -- definer e portanto ignora RLS — a permissão precisa ser checada aqui.
  if auth.uid() is not null then
    if winner.tenant_id is distinct from public.current_tenant_id() then
      raise exception 'Sem permissão para mesclar contatos de outra empresa';
    end if;
    if not public.is_admin()
       and not (winner.created_by = auth.uid() and loser.created_by = auth.uid()) then
      raise exception 'Só um administrador ou o dono dos dois contatos pode mesclar';
    end if;
  end if;

  update public.deals set contact_id = winner_id where contact_id = loser_id;
  update public.whatsapp_messages set contact_id = winner_id where contact_id = loser_id;
  update public.activities set contact_id = winner_id where contact_id = loser_id;
  update public.email_messages set contact_id = winner_id where contact_id = loser_id;
  update public.contact_attachments set contact_id = winner_id where contact_id = loser_id;
  update public.lead_tasks set contact_id = winner_id where contact_id = loser_id;

  -- Tabelas com chave única por (contato, X): move só o que o vencedor ainda
  -- não tem e descarta o resto, senão a própria mesclagem violaria a PK.
  update public.contact_tags ct
    set contact_id = winner_id
    where ct.contact_id = loser_id
      and not exists (
        select 1 from public.contact_tags w
        where w.contact_id = winner_id and w.tag_id = ct.tag_id
      );
  delete from public.contact_tags where contact_id = loser_id;

  update public.lead_channels lc
    set contact_id = winner_id
    where lc.contact_id = loser_id
      and not exists (
        select 1 from public.lead_channels w
        where w.contact_id = winner_id and w.channel = lc.channel
      );
  delete from public.lead_channels where contact_id = loser_id;

  insert into public.contact_merges (tenant_id, winner_id, loser_id, loser_snapshot, reason, merged_by)
  values (winner.tenant_id, winner_id, loser_id, to_jsonb(loser), reason, auth.uid());

  delete from public.contacts where id = loser_id;

  -- Completa só o que estava vazio: o vencedor é a fonte da verdade, o
  -- perdedor só preenche buraco (nunca sobrescreve dado bom com dado velho).
  update public.contacts set
    email = coalesce(email, loser.email),
    phone = coalesce(phone, loser.phone),
    lead_source = coalesce(lead_source, loser.lead_source),
    company_id = coalesce(company_id, loser.company_id),
    cpf_cnpj = coalesce(cpf_cnpj, loser.cpf_cnpj),
    address_zip = coalesce(address_zip, loser.address_zip),
    address_street = coalesce(address_street, loser.address_street),
    address_number = coalesce(address_number, loser.address_number),
    address_complement = coalesce(address_complement, loser.address_complement),
    address_neighborhood = coalesce(address_neighborhood, loser.address_neighborhood),
    address_city = coalesce(address_city, loser.address_city),
    address_state = coalesce(address_state, loser.address_state),
    bling_contact_id = coalesce(bling_contact_id, loser.bling_contact_id),
    -- Se qualquer um dos dois já foi cadastrado de verdade, o lead está cadastrado.
    needs_registration = winner.needs_registration and loser.needs_registration,
    updated_at = now()
  where id = winner_id;
end;
$$;

grant execute on function public.merge_contacts(uuid, uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5) Backfill: mescla o que já está duplicado, senão o índice único da
--    seção 6 falha e a migration inteira não sobe.
--    Só telefone idêntico depois de normalizado — sinal forte o bastante pra
--    resolver sozinho. Nome/e-mail parecidos ficam pra revisão humana.
--    O mais antigo vence (tem o histórico mais longo).
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  dup record;
  i int;
begin
  for dup in
    select tenant_id, phone_key, array_agg(id order by created_at, id) as ids
    from public.contacts
    where phone_key is not null
    group by tenant_id, phone_key
    having count(*) > 1
  loop
    for i in 2 .. array_length(dup.ids, 1) loop
      perform public.merge_contacts(dup.ids[1], dup.ids[i], 'backfill_phone');
    end loop;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6) As travas
-- ─────────────────────────────────────────────────────────────────────────
create unique index contacts_tenant_phone_key_uidx
  on public.contacts (tenant_id, phone_key)
  where phone_key is not null;

-- Não é único de propósito (ver o cabeçalho): serve pra busca por e-mail e
-- pra listar candidatos a duplicado.
create index contacts_tenant_email_key_idx
  on public.contacts (tenant_id, email_key)
  where email_key is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 7) Candidatos a duplicado (alimenta a tela "Duplicados")
--    Telefone não aparece aqui — a partir da seção 6 ele é impossível.
--    SECURITY INVOKER (padrão de function): roda sob o RLS de quem chamou,
--    então cada usuário só enxerga os contatos que já podia ver.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.contact_duplicate_candidates()
returns table (match_type text, match_value text, contact_ids uuid[], total int)
language sql
stable
as $$
  select 'email'::text, c.email_key, array_agg(c.id order by c.created_at), count(*)::int
  from public.contacts c
  where c.tenant_id = public.current_tenant_id()
    and c.email_key is not null
  group by c.email_key
  having count(*) > 1

  union all

  select 'name'::text, lower(btrim(c.name)), array_agg(c.id order by c.created_at), count(*)::int
  from public.contacts c
  where c.tenant_id = public.current_tenant_id()
    and btrim(coalesce(c.name, '')) <> ''
  group by lower(btrim(c.name))
  having count(*) > 1;
$$;

grant execute on function public.contact_duplicate_candidates() to authenticated;
