import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Busca real no catálogo (erp_produtos) — só leitura. Existe pra ancorar o
 * SDR em nome/preço reais antes de montar uma proposta; ele nunca deve
 * inventar nome ou preço de produto. */
export const BUSCAR_PRODUTOS_ERP_TOOL: Anthropic.Tool = {
  name: "buscar_produtos_erp",
  description:
    "Busca produtos reais no catálogo da empresa (ERP) pelo nome, pra saber o id, o preço e a unidade certos antes " +
    "de montar uma proposta. Use sempre que o lead mencionar um produto — nunca invente nome, preço ou id.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Termo de busca — parte do nome do produto mencionado pelo lead" },
    },
    required: ["query"],
  },
};

export async function executeBuscarProdutosErp(
  admin: Admin,
  tenantId: string,
  input: Record<string, unknown>,
): Promise<{ content: string; isError: boolean }> {
  const query = String(input.query ?? "").trim();
  if (!query) return { content: "Informe um termo de busca.", isError: true };

  const { data } = await admin
    .from("erp_produtos")
    .select("id, name, sku, unit, sale_price_cents, quantity")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(8);

  if (!data || data.length === 0) {
    return { content: `Nenhum produto encontrado pra "${query}". Pergunte ao lead o nome exato ou ofereça alternativas conhecidas.`, isError: false };
  }

  const list = data
    .map((p) => `- id: ${p.id} | ${p.name}${p.sku ? ` (SKU ${p.sku})` : ""} | R$ ${(p.sale_price_cents / 100).toFixed(2)}/${p.unit}`)
    .join("\n");

  return { content: `Produtos encontrados:\n${list}`, isError: false };
}
