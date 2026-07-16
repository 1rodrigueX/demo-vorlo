-- Cache do conteúdo (texto puro) do site cadastrado em tenant_company_profile.website
-- — o SDR consulta via ferramenta (search_company_website) sob demanda em vez de
-- buscar o site a cada mensagem; refetch acontece só quando o cache expira.
alter table public.tenant_company_profile
  add column website_content text,
  add column website_fetched_at timestamptz;
