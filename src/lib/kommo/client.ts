import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secrets";

/**
 * Client da API v4 do Kommo (ex-amoCRM).
 *
 * Três armadilhas da API que este arquivo isola do resto do código:
 *  - a última página de qualquer listagem vem **204 sem corpo**, não uma lista
 *    vazia — `response.json()` estoura se você não tratar;
 *  - telefone e e-mail do contato NÃO são colunas: vêm dentro de
 *    `custom_fields_values` com field_code PHONE/EMAIL (ver pickFieldByCode);
 *  - datas são Unix em segundos.
 */

const API_TIMEOUT_MS = 20_000;
/** Espaçamento mínimo entre chamadas. O limite documentado é bem maior; ficamos folgados de propósito. */
const MIN_REQUEST_SPACING_MS = 250;
const MAX_RETRIES = 3;

export class KommoNotConfiguredError extends Error {
  constructor() {
    super("Kommo não conectado para este CRM");
    this.name = "KommoNotConfiguredError";
  }
}

export class KommoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "KommoApiError";
  }
}

export type KommoCredentials = { subdomain: string; token: string };

let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + MIN_REQUEST_SPACING_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

/** Aceita o subdomínio puro ("minhaempresa") ou colado da URL inteira. */
export function parseSubdomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.kommo\.com.*$/, "")
    .replace(/\.amocrm\.(com|ru).*$/, "")
    .replace(/\/.*$/, "");
}

/**
 * Chamada crua à API. `path` é relativo a /api/v4 (ex: "/leads?page=1").
 * Devolve null quando o Kommo responde 204 (fim da paginação).
 */
export async function kommoFetch<T>(
  credentials: KommoCredentials,
  path: string,
  attempt = 0,
): Promise<T | null> {
  await throttle();

  const url = `https://${credentials.subdomain}.kommo.com/api/v4${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timeout);
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      return kommoFetch<T>(credentials, path, attempt + 1);
    }
    throw new KommoApiError(
      err instanceof Error && err.name === "AbortError"
        ? "O Kommo demorou demais para responder"
        : "Não foi possível falar com o Kommo",
      0,
    );
  }
  clearTimeout(timeout);

  // 204 = acabaram os registros. É assim que a paginação termina.
  if (response.status === 204) return null;

  if (response.status === 429 || response.status >= 500) {
    if (attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return kommoFetch<T>(credentials, path, attempt + 1);
    }
  }

  if (!response.ok) {
    throw new KommoApiError(describeStatus(response.status), response.status);
  }

  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new KommoApiError("O Kommo devolveu uma resposta que não é JSON", response.status);
  }
}

function describeStatus(status: number): string {
  switch (status) {
    case 401:
      return "Token recusado pelo Kommo (expirado ou revogado)";
    case 403:
      return "Token sem permissão para esse recurso no Kommo";
    case 404:
      return "Subdomínio não encontrado no Kommo";
    case 429:
      return "Limite de requisições do Kommo atingido";
    default:
      return `Kommo respondeu ${status}`;
  }
}

/** Credenciais salvas do tenant, já descriptografadas. */
export async function getKommoCredentials(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
): Promise<KommoCredentials> {
  const { data } = await admin
    .from("tenant_integrations")
    .select("credentials, access_token")
    .eq("tenant_id", tenantId)
    .eq("provider", "kommo")
    .maybeSingle();

  const subdomain = (data?.credentials as { subdomain?: string } | null)?.subdomain;
  if (!subdomain || !data?.access_token) throw new KommoNotConfiguredError();

  const token = decryptSecret(data.access_token);
  if (!token) throw new KommoNotConfiguredError();

  return { subdomain, token };
}

/**
 * Testa a conexão e devolve o nome da conta — usado no botão "Conectar" e no
 * "Testar conexão".
 */
export async function testKommoCredentials(
  credentials: KommoCredentials,
): Promise<{ ok: true; accountName: string } | { ok: false; error: string }> {
  try {
    const account = await kommoFetch<{ name?: string }>(credentials, "/account");
    return { ok: true, accountName: account?.name ?? credentials.subdomain };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao conectar no Kommo" };
  }
}

/** Uma página de listagem. `items` vazio significa que acabou. */
export async function kommoPage<T>(
  credentials: KommoCredentials,
  path: string,
  embeddedKey: string,
  page: number,
  limit = 250,
  extraQuery = "",
): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const body = await kommoFetch<{ _embedded?: Record<string, T[]> }>(
    credentials,
    `${path}${separator}page=${page}&limit=${limit}${extraQuery}`,
  );
  return body?._embedded?.[embeddedKey] ?? [];
}
