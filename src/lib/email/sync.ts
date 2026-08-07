import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidOAuthAccessToken } from "@/lib/integrations/oauth";
import { listGmailMessageIds, getGmailMessage } from "@/lib/email/gmail";
import { listOutlookMessages } from "@/lib/email/outlook";
import { findOrCreateContactByEmail, parseEmailAddress } from "@/lib/email/findOrCreateContactByEmail";
import { sanitizeEmailHtml } from "@/lib/email/sanitizeHtml";
import { publishChange } from "@/lib/realtime/bus";
import type { ParsedEmail } from "@/lib/email/types";
import type { OAuthProviderKey } from "@/lib/integrations/providers";

const SYNC_LIMIT = 25;

type Admin = ReturnType<typeof createAdminClient>;

/** Descarta os que já foram importados antes de gastar uma chamada de API por mensagem. */
async function filterUnsyncedIds(admin: Admin, provider: OAuthProviderKey, ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const { data: existingRows } = await admin
    .from("email_messages")
    .select("external_message_id")
    .eq("provider", provider)
    .in("external_message_id", ids);

  const existingIds = new Set((existingRows ?? []).map((r) => r.external_message_id));
  return ids.filter((id) => !existingIds.has(id));
}

async function insertEmails(
  admin: Admin,
  tenantId: string,
  provider: OAuthProviderKey,
  emails: ParsedEmail[],
): Promise<number> {
  let insertedCount = 0;

  for (const email of emails) {
    const { email: fromAddress, name: fromName } = parseEmailAddress(email.from);
    if (!fromAddress) continue;

    const contact = await findOrCreateContactByEmail(admin, tenantId, fromAddress, fromName);
    if (!contact) continue;

    const { data: insertedRow } = await admin
      .from("email_messages")
      .insert({
        tenant_id: tenantId,
        contact_id: contact.id,
        provider,
        external_message_id: email.externalId,
        thread_id: email.threadId,
        direction: "inbound",
        from_address: fromAddress,
        to_address: parseEmailAddress(email.to).email || email.to,
        subject: email.subject,
        body: email.body,
        body_html: email.bodyHtml ? sanitizeEmailHtml(email.bodyHtml) : null,
        status: "received",
        created_at: email.date,
      })
      .select("id")
      .single();

    if (insertedRow) {
      await admin.from("activities").insert({
        tenant_id: tenantId,
        contact_id: contact.id,
        type: "email",
        direction: "inbound",
        body: email.subject || email.body?.slice(0, 200) || "",
        email_message_id: insertedRow.id,
      });
      // Tempo real: e-mail novo aparece no chat de e-mail aberto do contato.
      publishChange(tenantId, "email_messages", "INSERT", contact.id);
      insertedCount++;
    }
  }

  return insertedCount;
}

async function syncProvider(tenantId: string, provider: OAuthProviderKey): Promise<number> {
  const accessToken = await getValidOAuthAccessToken(provider, tenantId);
  if (!accessToken) return 0;

  const admin = createAdminClient();

  if (provider === "gmail") {
    const ids = await listGmailMessageIds(accessToken, SYNC_LIMIT);
    const newIds = await filterUnsyncedIds(admin, provider, ids);
    if (!newIds.length) return 0;

    // Só busca o conteúdo completo das mensagens genuinamente novas, em paralelo
    // (antes buscava as 25 de novo a cada sincronização, sequencialmente — o
    // que deixava a tela de e-mails muito lenta).
    const emails = await Promise.all(newIds.map((id) => getGmailMessage(accessToken, id)));
    return insertEmails(admin, tenantId, provider, emails);
  }

  const allEmails = await listOutlookMessages(accessToken, SYNC_LIMIT);
  const newIds = new Set(await filterUnsyncedIds(admin, provider, allEmails.map((e) => e.externalId)));
  const newEmails = allEmails.filter((e) => newIds.has(e.externalId));
  return insertEmails(admin, tenantId, provider, newEmails);
}

/** Sincroniza as caixas de entrada de todas as integrações de e-mail conectadas do tenant. */
export async function syncEmailMessages(tenantId: string): Promise<{ synced: number }> {
  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("tenant_integrations")
    .select("provider")
    .eq("tenant_id", tenantId)
    .in("provider", ["gmail", "outlook"])
    .eq("status", "connected");

  let total = 0;
  for (const conn of connections ?? []) {
    try {
      total += await syncProvider(tenantId, conn.provider as OAuthProviderKey);
    } catch (err) {
      console.error(`syncEmailMessages: falha ao sincronizar ${conn.provider}`, err);
    }
  }

  return { synced: total };
}
