import "server-only";

/**
 * Verificação do captcha (Cloudflare Turnstile). Protege login/cadastro contra
 * robô/força-bruta. É BYO-key: sem TURNSTILE_SECRET_KEY, a verificação é
 * pulada (não bloqueia nada) — assim dá pra subir o código antes de ter a
 * chave, e ele se ativa sozinho quando a chave existir.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(token: string | null, remoteIp?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // captcha desligado → não bloqueia
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("verifyTurnstile falhou:", err);
    return false; // com captcha ligado, falha de rede fecha a porta (fail-closed)
  }
}
