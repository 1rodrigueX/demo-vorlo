import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";

const BLING_AUTHORIZE_URL = "https://www.bling.com.br/Api/v3/oauth/authorize";
const BLING_TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";
const BLING_API_BASE = "https://www.bling.com.br/Api/v3";

type BlingCredentials = { clientId: string; clientSecret: string };

async function getBlingCredentials(connectionId: string): Promise<BlingCredentials | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bling_connections")
    .select("client_id, client_secret")
    .eq("id", connectionId)
    .maybeSingle();

  if (!data?.client_id || !data.client_secret) return null;
  let clientSecret: string | null;
  try {
    clientSecret = decryptSecret(data.client_secret); // valores antigos em texto puro passam direto
  } catch {
    return null;
  }
  if (!clientSecret) return null;
  return { clientId: data.client_id, clientSecret };
}

export async function getBlingAuthorizeUrl(
  connectionId: string,
  state: string,
  redirectUri: string,
): Promise<string | null> {
  const credentials = await getBlingCredentials(connectionId);
  if (!credentials) return null;

  const url = new URL(BLING_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

type BlingTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

async function requestBlingToken(
  credentials: BlingCredentials,
  body: Record<string, string>,
): Promise<BlingTokenResponse> {
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString(
    "base64",
  );

  const res = await fetch(BLING_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "1.0",
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bling recusou a solicitação de token (${res.status}): ${text}`);
  }

  return res.json();
}

export async function exchangeBlingCode(
  connectionId: string,
  code: string,
): Promise<BlingTokenResponse> {
  const credentials = await getBlingCredentials(connectionId);
  if (!credentials) throw new Error("Client ID/Secret do Bling não configurados pra esta conexão");
  return requestBlingToken(credentials, { grant_type: "authorization_code", code });
}

/** Retorna um access_token válido pra essa conexão específica, renovando via refresh_token se estiver expirado. */
export async function getValidBlingAccessToken(connectionId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("bling_connections")
    .select("client_id, client_secret, access_token, refresh_token, expires_at")
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection?.access_token || !connection.refresh_token) return null;
  if (!connection.client_id || !connection.client_secret) return null;

  // Decifra o que veio do banco (valores antigos em texto puro passam direto).
  let accessToken: string | null;
  let refreshToken: string | null;
  let clientSecret: string | null;
  try {
    accessToken = decryptSecret(connection.access_token);
    refreshToken = decryptSecret(connection.refresh_token);
    clientSecret = decryptSecret(connection.client_secret);
  } catch (err) {
    console.error("getValidBlingAccessToken: falha ao descriptografar", err);
    return null;
  }
  if (!accessToken || !refreshToken || !clientSecret) return null;

  const isExpired = !connection.expires_at || new Date(connection.expires_at) <= new Date();
  if (!isExpired) return accessToken;

  const refreshed = await requestBlingToken(
    { clientId: connection.client_id, clientSecret },
    { grant_type: "refresh_token", refresh_token: refreshToken },
  );
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await admin
    .from("bling_connections")
    .update({
      access_token: encryptSecret(refreshed.access_token),
      refresh_token: encryptSecret(refreshed.refresh_token),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);

  return refreshed.access_token;
}

/** Fetch autenticado na API do Bling em nome de uma conexão (conta/filial) específica. */
export async function blingFetch(connectionId: string, path: string, init: RequestInit = {}) {
  const accessToken = await getValidBlingAccessToken(connectionId);
  if (!accessToken) {
    throw new Error("Esta conexão não está autenticada com o Bling");
  }

  const res = await fetch(`${BLING_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bling API falhou (${res.status} ${path}): ${text}`);
  }

  return res.json();
}
