"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { sendPlatformUpdateBatch, type PlatformUpdateEmail } from "@/lib/email/platformUpdate";
import { getPlatformOpenAIClient, ASSISTANT_MODEL, OpenAINotConfiguredError } from "@/lib/openai/client";

export type UpdateActionState = { error?: string } | null;

/** Limite do Resend por chamada de lote. */
const BATCH_SIZE = 100;
/** Página do listUsers da Admin API. */
const USERS_PAGE_SIZE = 200;

const updateSchema = z.object({
  title: z.string().trim().min(3, "Dê um título ao comunicado").max(160),
  version: z.string().trim().max(24).optional(),
  body: z.string().trim().min(10, "Escreva o conteúdo do comunicado").max(8000),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaUrl: z.union([z.url("Link inválido"), z.literal("")]).optional(),
});

export async function saveUpdate(_prevState: UpdateActionState, formData: FormData): Promise<UpdateActionState> {
  if (!(await isCurrentUserDev())) return { error: "Só o time Vorlo pode criar comunicados" };

  const parsed = updateSchema.safeParse({
    title: formData.get("title"),
    version: formData.get("version") || undefined,
    body: formData.get("body"),
    ctaLabel: formData.get("ctaLabel") || undefined,
    ctaUrl: formData.get("ctaUrl") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("platform_updates").insert({
    title: parsed.data.title,
    version: parsed.data.version || null,
    body: parsed.data.body,
    cta_label: parsed.data.ctaLabel || null,
    cta_url: parsed.data.ctaUrl || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("saveUpdate failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/dev/atualizacoes", "page");
  return null;
}

// ── "Escrever com IA" ──────────────────────────────────────────────────────

export type GeneratedUpdate = {
  title: string;
  version: string | null;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

const WRITE_UPDATE_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "escrever_comunicado",
    description: "Escreve o comunicado de atualização da Vorlo pronto para enviar por e-mail.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título curto e concreto (até ~8 palavras), sem 'novidade'/'atualização' genéricos." },
        version: { type: "string", description: "Versão curta se fizer sentido (ex: v2.4). Vazio se não souber." },
        body: {
          type: "string",
          description:
            "Corpo do e-mail em português do Brasil, em PRIMEIRA PESSOA (eu), voz calorosa e direta do fundador da Vorlo. Parágrafos separados por linha em branco. Conta o que mudou e o que a pessoa ganha com isso. Sem jargão corporativo, sem 'estamos felizes em anunciar'.",
        },
        ctaLabel: { type: "string", description: "Texto curto do botão, se houver ação (ex: 'Ver no CRM'). Vazio se não precisar." },
        ctaUrl: { type: "string", description: "Link do botão, se houver. Vazio se não souber a URL." },
      },
      required: ["title", "body"],
    },
  },
};

const generatedSchema = z.object({
  title: z.string().trim().min(3).max(160),
  version: z.string().trim().max(24).optional().default(""),
  body: z.string().trim().min(10).max(8000),
  ctaLabel: z.string().trim().max(40).optional().default(""),
  ctaUrl: z.string().trim().max(400).optional().default(""),
});

/**
 * Redige o comunicado a partir de uma instrução curta do dev (ex.: "chat de
 * WhatsApp com áudio e imagem no app"). Devolve os campos preenchidos pra o dev
 * revisar e disparar — a IA escreve, o humano lança. Usa a chave da PLATAFORMA.
 */
export async function generatePlatformUpdate(
  instruction: string,
): Promise<{ update: GeneratedUpdate } | { error: string }> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };

  const clean = (instruction ?? "").trim();
  if (clean.length < 3) return { error: "Descreva em uma frase o que foi lançado." };
  if (clean.length > 2000) return { error: "Instrução muito longa (máx. 2000 caracteres)." };

  let client: OpenAI;
  try {
    client = await getPlatformOpenAIClient();
  } catch (err) {
    if (err instanceof OpenAINotConfiguredError) {
      return { error: "IA da plataforma indisponível: configure a chave em /dev/ia." };
    }
    return { error: "IA indisponível no momento." };
  }

  const system = [
    "Você é a voz da Vorlo (uma plataforma brasileira de CRM com IA) escrevendo um comunicado de atualização por e-mail para os clientes.",
    "Escreva SEMPRE chamando a ferramenta escrever_comunicado — nunca texto solto.",
    "Voz: primeira pessoa do singular (eu), calorosa, direta e humana — como o fundador falando com quem usa o produto. Nada de 'nós, da Vorlo' nem 'estamos felizes em anunciar'.",
    "Foque no que a pessoa GANHA com a mudança, em linguagem simples. Português do Brasil.",
    "Se a instrução não mencionar link, deixe ctaUrl e ctaLabel vazios.",
  ].join("\n");

  let toolInput: unknown;
  try {
    const resp = await client.chat.completions.create({
      model: ASSISTANT_MODEL,
      max_completion_tokens: 4000,
      reasoning_effort: "none",
      tools: [WRITE_UPDATE_TOOL],
      tool_choice: { type: "function", function: { name: "escrever_comunicado" } },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Lancei isto: ${clean}\n\nEscreva o comunicado.` },
      ],
    });
    const call = resp.choices[0]?.message?.tool_calls?.find(
      (c) => c.type === "function" && c.function.name === "escrever_comunicado",
    );
    if (!call || call.type !== "function") {
      return { error: "A IA não conseguiu escrever. Tente reescrever a instrução." };
    }
    toolInput = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return { error: `Falha ao escrever com IA: ${msg}` };
  }

  const parsed = generatedSchema.safeParse(toolInput);
  if (!parsed.success) return { error: "A IA devolveu um formato inesperado. Tente de novo." };

  return {
    update: {
      title: parsed.data.title,
      version: parsed.data.version || null,
      body: parsed.data.body,
      ctaLabel: parsed.data.ctaLabel || null,
      ctaUrl: parsed.data.ctaUrl || null,
    },
  };
}

export async function deleteUpdate(id: string): Promise<UpdateActionState> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };

  const supabase = await createClient();
  const { error } = await supabase.from("platform_updates").delete().eq("id", id).eq("status", "draft");
  if (error) return { error: "Não foi possível apagar (comunicado já enviado não some)" };

  revalidatePath("/dev/atualizacoes", "page");
  return null;
}

/**
 * Destinatários: todo e-mail cadastrado, mesmo quem nunca acessou — por isso
 * a lista sai de auth.users (Admin API) e não de profiles, que só existe
 * depois de escolher um plano. Descadastrados ficam de fora.
 */
async function listRecipients(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const emails: string[] = [];

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USERS_PAGE_SIZE });
    if (error) throw new Error(`Não foi possível listar os cadastros: ${error.message}`);

    for (const user of data.users) {
      if (user.email) emails.push(user.email.toLowerCase());
    }
    if (data.users.length < USERS_PAGE_SIZE) break;
  }

  const unique = [...new Set(emails)];

  const { data: optouts } = await admin.from("platform_email_optouts").select("email");
  const excluded = new Set((optouts ?? []).map((row) => row.email.toLowerCase()));

  return unique.filter((email) => !excluded.has(email));
}

/** Quantos receberiam agora — mostrado antes de disparar, pra não enviar às cegas. */
export async function countRecipients(): Promise<{ total: number } | { error: string }> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };
  try {
    const recipients = await listRecipients(createAdminClient());
    return { total: recipients.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao contar destinatários" };
  }
}

/** Envia só pra você — confere o visual antes de mandar pra base inteira. */
export async function sendTestUpdate(id: string, to: string): Promise<UpdateActionState> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };
  if (!to.includes("@")) return { error: "Informe um e-mail válido para o teste" };

  const supabase = await createClient();
  const { data: update } = await supabase.from("platform_updates").select("*").eq("id", id).maybeSingle();
  if (!update) return { error: "Comunicado não encontrado" };

  const result = await sendPlatformUpdateBatch(toEmailPayload(update), [to]);
  if (result.error) return { error: `Falha no teste: ${result.error}` };
  return null;
}

/**
 * Dispara o comunicado. Envia em lotes de 100 e vai gravando o progresso, pra
 * uma falha no meio não deixar dúvida sobre quantos já receberam.
 */
export async function sendUpdate(id: string): Promise<{ error?: string; sent?: number }> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };

  const supabase = await createClient();
  const { data: update } = await supabase.from("platform_updates").select("*").eq("id", id).maybeSingle();
  if (!update) return { error: "Comunicado não encontrado" };
  // Trava contra clique duplo: um comunicado só sai uma vez.
  if (update.status !== "draft") return { error: "Este comunicado já foi enviado" };

  const admin = createAdminClient();

  let recipients: string[];
  try {
    recipients = await listRecipients(admin);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao montar a lista" };
  }

  if (!recipients.length) return { error: "Nenhum destinatário — todos descadastrados ou base vazia" };

  await admin
    .from("platform_updates")
    .update({ status: "sending", recipients_total: recipients.length, recipients_sent: 0, recipients_failed: 0 })
    .eq("id", id);

  const payload = toEmailPayload(update);
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const result = await sendPlatformUpdateBatch(payload, batch);
    sent += result.sent;
    failed += result.failed;
    if (result.error) lastError = result.error;

    await admin
      .from("platform_updates")
      .update({ recipients_sent: sent, recipients_failed: failed })
      .eq("id", id);
  }

  await admin
    .from("platform_updates")
    .update({
      status: failed && !sent ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      error: lastError ?? null,
    })
    .eq("id", id);

  revalidatePath("/dev/atualizacoes", "page");

  if (failed && !sent) return { error: `Nenhum e-mail saiu: ${lastError ?? "erro desconhecido"}` };
  return { sent };
}

type UpdateRow = {
  title: string;
  version: string | null;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
};

function toEmailPayload(update: UpdateRow): PlatformUpdateEmail {
  return {
    title: update.title,
    version: update.version,
    body: update.body,
    ctaLabel: update.cta_label,
    ctaUrl: update.cta_url,
  };
}
