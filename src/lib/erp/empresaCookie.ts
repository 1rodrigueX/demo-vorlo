/** Nome do cookie que guarda qual empresa/filial (erp_empresas.id) está
 * selecionada no seletor do Topbar do ERP — lido por Server Components
 * (Nova Proposta etc.) como default, sem precisar de query string.
 * Sem "server-only": é importado tanto por Server Components quanto pelo
 * client component do seletor (só o nome da constante, nada sensível). */
export const CURRENT_EMPRESA_COOKIE = "erp_empresa_atual";
