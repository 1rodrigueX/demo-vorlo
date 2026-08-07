"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { sendPlatformUpdateBatch, type PlatformUpdateEmail } from "@/lib/email/platformUpdate";

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
  if (!(await isCurrentUserDev())) return { error: "Só o time Synexa pode criar comunicados" };

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
