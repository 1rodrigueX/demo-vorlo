import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidOAuthAccessToken } from "@/lib/integrations/oauth";
import { sendGmailMessage } from "@/lib/email/gmail";
import { sendOutlookMessage } from "@/lib/email/outlook";
import type { OAuthProviderKey } from "@/lib/integrations/providers";
import type { EmailAttachmentInput } from "@/lib/email/types";

export type SendEmailResult = { externalId: string; provider: OAuthProviderKey; fromAddress: string };

export async function getConnectedEmailProviders(
  tenantId: string,
): Promise<{ provider: OAuthProviderKey; address: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_integrations")
    .select("provider, name")
    .eq("tenant_id", tenantId)
    .in("provider", ["gmail", "outlook"])
    .eq("status", "connected");

  return (data ?? []).map((d) => ({ provider: d.provider as OAuthProviderKey, address: d.name || "" }));
}

export async function sendEmailMessage(
  tenantId: string,
  provider: OAuthProviderKey,
  params: { to: string; subject: string; body: string; attachments?: EmailAttachmentInput[] },
): Promise<SendEmailResult> {
  const accessToken = await getValidOAuthAccessToken(provider, tenantId);
  if (!accessToken) {
    throw new Error(`Conta ${provider === "gmail" ? "Gmail" : "Outlook"} não está conectada`);
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("tenant_integrations")
    .select("name")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();

  const externalId =
    provider === "gmail"
      ? await sendGmailMessage(accessToken, params)
      : await sendOutlookMessage(accessToken, params);

  return { externalId, provider, fromAddress: connection?.name || "" };
}
