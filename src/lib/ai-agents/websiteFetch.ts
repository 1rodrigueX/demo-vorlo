import "server-only";
import { htmlToPlainText } from "@/lib/email/sanitizeHtml";

const FETCH_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_LENGTH = 8000;

/** Bloqueia loopback/rede local/link-local (ex: 169.254.169.254 — metadata de nuvem) pra evitar SSRF via um site cadastrado com má intenção. */
function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  return false;
}

/** Busca uma URL e extrai o texto puro (sem tags) pra dar contexto real de site ao SDR. */
export async function fetchWebsiteText(rawUrl: string): Promise<{ text: string } | { error: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: "URL inválida" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Só URLs http/https são permitidas" };
  }
  if (isBlockedHostname(url.hostname)) {
    return { error: "Esse endereço não pode ser acessado" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VorloCrmBot/1.0)" },
    });
    if (!response.ok) return { error: `O site respondeu com erro ${response.status}` };

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return { error: "O conteúdo dessa URL não é uma página web" };
    }

    const reader = response.body?.getReader();
    if (!reader) return { error: "Não foi possível ler a resposta do site" };

    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    const text = htmlToPlainText(html).slice(0, MAX_TEXT_LENGTH);
    if (!text) return { error: "A página não tem conteúdo de texto legível" };
    return { text };
  } catch (err) {
    const message = err instanceof Error ? err.message : "falha desconhecida";
    return { error: `Não foi possível acessar o site: ${message}` };
  } finally {
    clearTimeout(timeout);
  }
}
