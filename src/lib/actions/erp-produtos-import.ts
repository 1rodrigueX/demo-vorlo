"use server";

import type OpenAI from "openai";
import * as XLSX from "xlsx";
import { currentTenantContext, revalidateTenantPaths } from "@/lib/auth/current-user";
import { getOpenAIClientForTenant, ASSISTANT_MODEL, OpenAINotConfiguredError } from "@/lib/openai/client";

/**
 * Importação de produtos por IA: o dono joga a tabela do fornecedor (PDF,
 * planilha, CSV ou até uma foto da lista de preços) e a IA devolve os produtos
 * estruturados. NADA é gravado aqui — a extração só devolve a lista pra tela
 * mostrar em prévia editável; quem grava é confirmarImportacaoProdutos(),
 * depois que o dono revisou. Arquivo torto/mal lido não vira produto no
 * catálogo sem alguém ver antes.
 */

export type ProdutoExtraido = {
  name: string;
  sku: string;
  unit: string;
  costPriceReais: number;
  salePriceReais: number;
  quantity: number;
  minStock: number;
};

export type ImportResult = { produtos: ProdutoExtraido[]; aviso?: string } | { error: string };

/** 10 MB: acima disso o base64 no prompt fica caro e lento demais. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Teto por importação — evita estourar contexto e a conta num arquivo gigante. */
const MAX_PRODUTOS = 200;

const SPREADSHEET_EXTS = /\.(xlsx|xlsm|xls|ods)$/i;
const CSV_EXTS = /\.(csv|tsv|txt)$/i;
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const EXTRAIR_PRODUTOS_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "extrair_produtos",
    description:
      "Devolve os produtos encontrados no arquivo, já estruturados para cadastro no ERP. " +
      "Chame SEMPRE esta ferramenta, mesmo que encontre poucos produtos.",
    parameters: {
      type: "object",
      properties: {
        produtos: {
          type: "array",
          description: "Um item por produto encontrado. Não invente produto que não está no arquivo.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nome/descrição do produto, como está no arquivo" },
              sku: { type: "string", description: "Código/SKU/referência do produto. Vazio se não houver." },
              unit: { type: "string", description: "Unidade (un, kg, m, cx, pct...). Use 'un' se não houver." },
              costPriceReais: { type: "number", description: "Preço de CUSTO em reais. 0 se não houver." },
              salePriceReais: { type: "number", description: "Preço de VENDA em reais. 0 se não houver." },
              quantity: { type: "number", description: "Quantidade em estoque. 0 se não houver." },
              minStock: { type: "number", description: "Estoque mínimo. 0 se não houver." },
            },
            required: ["name"],
          },
        },
        aviso: {
          type: "string",
          description:
            "Se algo ficou ambíguo (ex.: só havia uma coluna de preço e você assumiu que era venda), explique em uma frase. Vazio se estava tudo claro.",
        },
      },
      required: ["produtos"],
    },
  },
};

const SYSTEM_PROMPT = [
  "Você extrai produtos de tabelas/listas para cadastro em um ERP brasileiro.",
  "Responda SEMPRE chamando a ferramenta extrair_produtos — nunca texto solto.",
  "",
  "REGRAS:",
  "- Extraia SOMENTE o que está no arquivo. Nunca invente produto, código ou preço.",
  "- Ignore cabeçalhos, rodapés, totais, condições comerciais e linhas em branco.",
  "- Preço em formato brasileiro: '1.234,56' são mil duzentos e trinta e quatro reais e cinquenta e seis centavos -> 1234.56.",
  "- Se houver só UMA coluna de preço, trate como preço de VENDA (salePriceReais) e diga isso no aviso.",
  "- Se um campo não existir no arquivo, use 0 (números) ou string vazia — não chute.",
  "- Mantenha o nome do produto como está no arquivo; não reescreva nem 'melhore'.",
].join("\n");

/** Converte planilha/CSV em CSV de texto — o modelo lê tabela em texto muito melhor que binário. */
function spreadsheetToCsv(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer" });
  return wb.SheetNames.map((sheetName) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
    return wb.SheetNames.length > 1 ? `--- planilha: ${sheetName} ---\n${csv}` : csv;
  }).join("\n\n");
}

export async function extrairProdutosDeArquivo(formData: FormData): Promise<ImportResult> {
  const { tenantId } = await currentTenantContext();
  if (!tenantId) return { error: "Tenant não encontrado" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo." };
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Arquivo muito grande (máx. 10 MB). Exporte só a parte da tabela que interessa." };
  }

  let client: OpenAI;
  try {
    client = await getOpenAIClientForTenant(tenantId);
  } catch (err) {
    if (err instanceof OpenAINotConfiguredError) {
      return { error: "Conecte a chave da OpenAI em Configurações › Inteligência Artificial pra usar a importação por IA." };
    }
    return { error: "IA indisponível no momento." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = file.name || "arquivo";
  const mime = file.type || "";

  // Cada formato entra do jeito que o modelo lê melhor: planilha vira CSV de
  // texto, PDF e imagem vão nativos (o GPT-5.6 lê os dois sem pré-processo).
  let userContent: string | OpenAI.Chat.Completions.ChatCompletionContentPart[];
  try {
    if (SPREADSHEET_EXTS.test(name)) {
      const csv = spreadsheetToCsv(bytes);
      if (!csv.trim()) return { error: "A planilha está vazia ou não pôde ser lida." };
      userContent = `Extraia os produtos desta planilha (convertida para CSV):\n\n${csv.slice(0, 200_000)}`;
    } else if (CSV_EXTS.test(name) || mime.startsWith("text/")) {
      const text = bytes.toString("utf8");
      if (!text.trim()) return { error: "O arquivo está vazio." };
      userContent = `Extraia os produtos desta lista:\n\n${text.slice(0, 200_000)}`;
    } else if (mime === "application/pdf" || /\.pdf$/i.test(name)) {
      userContent = [
        { type: "text", text: "Extraia os produtos deste PDF." },
        { type: "file", file: { filename: name, file_data: `data:application/pdf;base64,${bytes.toString("base64")}` } },
      ];
    } else if (IMAGE_MIMES.has(mime)) {
      userContent = [
        { type: "text", text: "Extraia os produtos desta imagem da tabela." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${bytes.toString("base64")}` } },
      ];
    } else {
      return { error: "Formato não suportado. Envie planilha (.xlsx/.xls/.ods), CSV, PDF ou imagem." };
    }
  } catch (err) {
    console.error("extrairProdutosDeArquivo: falha ao ler o arquivo", err);
    return { error: "Não foi possível ler esse arquivo. Confira se ele não está corrompido ou protegido por senha." };
  }

  try {
    const resp = await client.chat.completions.create({
      model: ASSISTANT_MODEL,
      max_completion_tokens: 16000,
      reasoning_effort: "none", // obrigatório junto com tools (ver openai/client.ts)
      tools: [EXTRAIR_PRODUTOS_TOOL],
      tool_choice: { type: "function", function: { name: "extrair_produtos" } },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const call = resp.choices[0]?.message?.tool_calls?.find(
      (c) => c.type === "function" && c.function.name === "extrair_produtos",
    );
    if (!call || call.type !== "function") {
      return { error: "A IA não conseguiu ler esse arquivo. Tente um formato mais simples (CSV ou planilha)." };
    }

    const raw = JSON.parse(call.function.arguments || "{}") as {
      produtos?: unknown[];
      aviso?: string;
    };
    const produtos = (raw.produtos ?? [])
      .map((p) => {
        const row = p as Record<string, unknown>;
        const nome = String(row.name ?? "").trim();
        if (!nome) return null;
        const num = (v: unknown) => {
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 ? n : 0;
        };
        return {
          name: nome.slice(0, 200),
          sku: String(row.sku ?? "").trim().slice(0, 80),
          unit: (String(row.unit ?? "").trim() || "un").slice(0, 12),
          costPriceReais: num(row.costPriceReais),
          salePriceReais: num(row.salePriceReais),
          quantity: num(row.quantity),
          minStock: num(row.minStock),
        } satisfies ProdutoExtraido;
      })
      .filter((p): p is ProdutoExtraido => p !== null)
      .slice(0, MAX_PRODUTOS);

    if (!produtos.length) {
      return { error: "Nenhum produto foi encontrado nesse arquivo. Confira se ele tem uma tabela de produtos." };
    }

    return { produtos, aviso: raw.aviso?.trim() || undefined };
  } catch (err) {
    console.error("extrairProdutosDeArquivo: falha na IA", err);
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return { error: `Falha ao ler com IA: ${msg}` };
  }
}

export type ConfirmResult = { criados: number; ignorados: number } | { error: string };

/**
 * Grava os produtos revisados pelo dono. Duplicidade não é erro: o índice
 * único de nome/SKU por tenant faz o insert falhar (23505) e a linha é
 * ignorada — reimportar a mesma tabela não duplica catálogo nem trava tudo
 * por causa de um item repetido.
 */
export async function confirmarImportacaoProdutos(produtos: ProdutoExtraido[]): Promise<ConfirmResult> {
  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  if (!Array.isArray(produtos) || produtos.length === 0) return { error: "Nada para importar." };
  if (produtos.length > MAX_PRODUTOS) return { error: `Máximo de ${MAX_PRODUTOS} produtos por importação.` };

  let criados = 0;
  let ignorados = 0;

  for (const p of produtos) {
    const nome = String(p.name ?? "").trim();
    if (!nome) {
      ignorados++;
      continue;
    }
    const { error } = await supabase.from("erp_produtos").insert({
      tenant_id: tenantId,
      name: nome,
      sku: p.sku?.trim() || null,
      unit: p.unit?.trim() || "un",
      cost_price_cents: Math.round((Number(p.costPriceReais) || 0) * 100),
      sale_price_cents: Math.round((Number(p.salePriceReais) || 0) * 100),
      quantity: Number(p.quantity) || 0,
      min_stock: Number(p.minStock) || 0,
    });
    if (error) ignorados++;
    else criados++;
  }

  await revalidateTenantPaths(supabase, tenantId, ["/erp/cadastros/produtos"]);
  return { criados, ignorados };
}
