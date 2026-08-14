import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createErpPropostaCore } from "@/lib/erp/propostaCore";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Monta uma proposta-RASCUNHO no ERP a partir do que o lead pediu — nunca
 * envia nada pro cliente sozinha (isso é decisão explícita do dono da
 * conta: o SDR monta, um vendedor humano aprova e envia pela tela do ERP).
 * Preço não faz parte do input_schema de propósito: o preço real de cada
 * produto é sempre lido de novo em erp_produtos dentro de
 * createErpPropostaCore — a IA nunca tem como "informar" um preço, só
 * escolher produto e quantidade.
 */
export const MONTAR_PROPOSTA_ERP_TOOL: Anthropic.Tool = {
  name: "montar_proposta_erp",
  description:
    "Monta uma proposta comercial em RASCUNHO no ERP com os produtos que o lead quer — não envia nada pro cliente, " +
    "só deixa pronta pra um vendedor revisar e enviar. Use buscar_produtos_erp antes pra confirmar o id exato de " +
    "cada produto. Chame só depois de confirmar com o lead quais produtos e quantidades ele quer.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "Produtos que o lead quer, com o id exato retornado por buscar_produtos_erp",
        items: {
          type: "object",
          properties: {
            produtoId: { type: "string", description: "id do produto (de buscar_produtos_erp)" },
            quantity: { type: "number", description: "Quantidade desejada" },
          },
          required: ["produtoId", "quantity"],
        },
      },
      notes: { type: "string", description: "Observações relevantes da conversa pro vendedor (opcional)" },
    },
    required: ["items"],
  },
};

export async function executeMontarPropostaErp(
  admin: Admin,
  tenantId: string,
  contactId: string,
  sellerId: string,
  input: Record<string, unknown>,
): Promise<{ content: string; isError: boolean }> {
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems
    .map((i) => ({
      produtoId: typeof i === "object" && i ? String((i as Record<string, unknown>).produtoId ?? "") : "",
      quantity: typeof i === "object" && i ? Number((i as Record<string, unknown>).quantity ?? 0) : 0,
    }))
    .filter((i) => i.produtoId && i.quantity > 0);

  if (!items.length) {
    return { content: "Nenhum item válido informado — use buscar_produtos_erp pra pegar o id certo do produto.", isError: true };
  }

  const notes = input.notes ? String(input.notes).trim() : null;

  const result = await createErpPropostaCore(admin, tenantId, contactId, items, {
    source: "sdr",
    sellerId,
    notes,
  });

  if (result.error || !result.proposta) {
    return { content: `Não foi possível montar a proposta: ${result.error ?? "erro desconhecido"}`, isError: true };
  }

  return {
    content:
      `Proposta ${result.proposta.number} montada como rascunho e o vendedor responsável já foi avisado pra revisar. ` +
      `Diga ao lead que um vendedor vai revisar e enviar a proposta em breve — não diga que já foi enviada.`,
    isError: false,
  };
}
