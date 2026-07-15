import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOAuthProviderConfig, type OAuthProviderKey } from "./providers";

export function getAuthorizeUrl(provider: OAuthProviderKey, state: string, redirectUri: string): string | null {
  const config = getOAuthProviderConfig(provider);
  if (!config.clientId) return null;

  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  for (const [key, value] of Object.entries(config.extraAuthorizeParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
};

async function requestToken(provider: OAuthProviderKey, body: Record<string, string>): Promise<TokenResponse> {
  const config = getOAuthProviderConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Integração ${provider} não está configurada nesta plataforma`);
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, client_id: config.clientId, client_secret: config.clientSecret }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider} recusou a solicitação de token (${res.status}): ${text}`);
  }

  return res.json();
}

/** Decodifica só o payload do id_token (JWT) pra pegar o e-mail da conta conectada — sem verificar assinatura, pois o token veio direto por HTTPS do próprio provedor (Google/Microsoft), não de uma fonte não confiável. */
function extractEmailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const claims = JSON.parse(json) as { email?: string };
    return claims.email ?? null;
  } catch {
    return null;
  }
}

export async function exchangeOAuthCode(
  provider: OAuthProviderKey,
  tenantId: string,
  code: string,
  redirectUri: string,
): Promise<void> {
  const token = await requestToken(provider, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
  const email = extractEmailFromIdToken(token.id_token);

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("tenant_integrations")
    .select("id, refresh_token")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();

  const now = new Date().toISOString();
  const payload = {
    tenant_id: tenantId,
    provider,
    name: email ?? "",
    status: "connected" as const,
    access_token: token.access_token,
    // Google só manda refresh_token no primeiro consentimento; se não vier de novo, mantém o que já tinha.
    refresh_token: token.refresh_token ?? existing?.refresh_token ?? null,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    connected_at: now,
    last_error: null,
    updated_at: now,
  };

  if (existing) {
    await admin.from("tenant_integrations").update(payload).eq("id", existing.id);
  } else {
    await admin.from("tenant_integrations").insert(payload);
  }
}

/** Retorna um access_token válido pro tenant, renovando via refresh_token se estiver expirado. */
export async function getValidOAuthAccessToken(
  provider: OAuthProviderKey,
  tenantId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("tenant_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();

  if (!connection?.access_token) return null;

  const isExpired = !connection.expires_at || new Date(connection.expires_at) <= new Date();
  if (!isExpired) return connection.access_token;
  if (!connection.refresh_token) return null;

  const refreshed = await requestToken(provider, {
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token,
  });

  await admin
    .from("tenant_integrations")
    .update({
      access_token: refreshed.access_token,
      // A Microsoft manda um refresh_token novo a cada renovação; o Google mantém o mesmo.
      refresh_token: refreshed.refresh_token ?? connection.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("provider", provider);

  return refreshed.access_token;
}
