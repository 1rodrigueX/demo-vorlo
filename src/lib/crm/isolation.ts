/**
 * Isolamento do CRM (fase 5).
 *
 * Enquanto cada flag está `false`, o CRM fica standalone: não dispara efeitos
 * nem provisiona os módulos de financeiro/estoque/produção. NADA foi removido —
 * todo o código e os dados desses módulos continuam no lugar. Para RELIGAR um
 * módulo ao CRM (quando o usuário pedir), basta trocar a flag pra `true`.
 *
 * Acoplamentos controlados por essas flags:
 *  - financas: venda ganha cria lançamento no inbox financeiro
 *              (createDealWonInboxEntry) + concessão automática de finanças a
 *              novos tenants (grantFreeFinancasEmpresarial).
 *  - estoque:  venda ganha dá baixa no estoque (baixarEstoqueVenda).
 *  - producao: reservado (sem acoplamento a partir do CRM hoje).
 */
export const CRM_MODULE_COUPLING = {
  financas: false,
  estoque: false,
  producao: false,
} as const;
