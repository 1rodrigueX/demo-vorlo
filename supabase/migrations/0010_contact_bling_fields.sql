-- Campos que o Bling pede pra completar o cadastro de cliente (CPF/CNPJ e
-- endereço) e que o CRM ainda não tinha onde guardar.
alter table public.contacts
  add column cpf_cnpj text,
  add column address_zip text,
  add column address_street text,
  add column address_number text,
  add column address_complement text,
  add column address_neighborhood text,
  add column address_city text,
  add column address_state text;
