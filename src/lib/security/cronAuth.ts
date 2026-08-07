import "server-only";
import { logSecurityEvent, getClientIp, getUserAgent } from "@/lib/security/events";

/**
 * Valida o segredo compartilhado dos endpoints de cron (o crontab da VPS manda
 * no header x-cron-secret). Centraliza a checagem que estava repetida em cada
 * rota e, de quebra, registra toda tentativa recusada no painel de segurança —
 * um cron batendo com segredo errado é ou o crontab desconfigurado, ou alguém
 * sondando os endpoints internos. Os dois casos você quer ver.
 *
 * true = autorizado. false = quem chamou deve responder 401.
 */
export function verifyCronSecret(request: Request, endpoint: string): boolean {
  const provided = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (expected && provided === expected) return true;

  void logSecurityEvent({
    type: "cron_unauthorized",
    ip: getClientIp(request),
    userAgent: getUserAgent(request),
    detail: { endpoint, hadSecret: Boolean(provided) },
  });

  return false;
}
