import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";

/**
 * Registro de eventos de segurança + defesa por IP. Alimenta o painel de
 * cibersegurança em tempo real do time Synexa (ver src/app/dev/seguranca).
 *
 * Regra de ouro deste arquivo: NADA aqui pode derrubar o fluxo que chamou. Um
 * log de segurança que quebra o login é pior que não ter log nenhum. Por isso
 * tudo é try/catch silencioso e as chamadas devem ser feitas com `void` (sem
 * await bloqueante).
 */

export type SecuritySeverity = "info" | "warn" | "critical";

/**
 * Vocabulário fechado de eventos — string livre viraria um painel impossível
 * de filtrar. Cada novo tipo entra aqui de propósito.
 */
export type SecurityEventType =
  | "login_success"
  | "login_failed"
  | "login_blocked"
  | "logout"
  | "mfa_challenge"
  | "mfa_failed"
  | "password_reset_requested"
  | "rate_limited"
  | "cron_unauthorized"
  | "api_key_invalid"
  | "signed_url_invalid"
  | "permission_denied"
  | "suspicious_input"
  | "ip_blocked"
  | "ip_unblocked";

/** Gravidade padrão de cada tipo — o chamador pode sobrescrever. */
const DEFAULT_SEVERITY: Record<SecurityEventType, SecuritySeverity> = {
  login_success: "info",
  login_failed: "warn",
  login_blocked: "critical",
  logout: "info",
  mfa_challenge: "info",
  mfa_failed: "warn",
  password_reset_requested: "info",
  rate_limited: "warn",
  cron_unauthorized: "critical",
  api_key_invalid: "warn",
  signed_url_invalid: "warn",
  permission_denied: "warn",
  suspicious_input: "critical",
  ip_blocked: "critical",
  ip_unblocked: "info",
};

export type SecurityEventInput = {
  type: SecurityEventType;
  severity?: SecuritySeverity;
  ip?: string | null;
  userAgent?: string | null;
  tenantId?: string | null;
  userId?: string | null;
  detail?: Record<string, unknown>;
};

/**
 * Grava um evento. Fire-and-forget: chame com `void logSecurityEvent(...)`.
 * Nunca lança — se o banco estiver fora, o erro fica no console do servidor e
 * o fluxo original segue intacto.
 */
export async function logSecurityEvent(event: SecurityEventInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_events").insert({
      tenant_id: event.tenantId ?? null,
      user_id: event.userId ?? null,
      event_type: event.type,
      severity: event.severity ?? DEFAULT_SEVERITY[event.type],
      ip: event.ip ?? null,
      user_agent: event.userAgent?.slice(0, 500) ?? null,
      detail: (event.detail ?? {}) as Json,
    });
  } catch (err) {
    console.error("logSecurityEvent falhou (ignorado):", err);
  }
}

/** IP de origem, atrás do proxy da VPS. O primeiro da cadeia é o cliente real. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "desconhecido";
  return request.headers.get("x-real-ip")?.trim() || "desconhecido";
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}

/**
 * true se o IP está bloqueado e o bloqueio ainda vale. Nunca lança: se a
 * checagem falhar, deixa passar em vez de derrubar um endpoint legítimo por
 * causa de uma indisponibilidade do banco (fail-open é a escolha certa aqui —
 * o oposto seria o próprio sistema de defesa virando um jeito de tirar o site
 * do ar).
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!ip || ip === "desconhecido") return false;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("blocked_ips")
      .select("expires_at")
      .eq("ip", ip)
      .maybeSingle();

    if (!data) return false;
    if (!data.expires_at) return true; // permanente
    return new Date(data.expires_at).getTime() > Date.now();
  } catch (err) {
    console.error("isIpBlocked falhou (deixando passar):", err);
    return false;
  }
}

/**
 * Bloqueia (ou reforça o bloqueio de) um IP. Usado pela defesa automática e
 * pelo painel. Também registra o evento.
 */
export async function blockIp(params: {
  ip: string;
  reason: string;
  severity?: "warn" | "critical";
  source?: "auto" | "manual";
  expiresInMinutes?: number | null;
  blockedBy?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const expiresAt =
      params.expiresInMinutes == null
        ? null
        : new Date(Date.now() + params.expiresInMinutes * 60_000).toISOString();

    // hits acumula quando o mesmo IP volta a bater — mostra reincidência no
    // painel sem criar linha nova.
    const { data: existing } = await admin.from("blocked_ips").select("hits").eq("ip", params.ip).maybeSingle();

    await admin.from("blocked_ips").upsert(
      {
        ip: params.ip,
        reason: params.reason,
        severity: params.severity ?? "warn",
        source: params.source ?? "auto",
        hits: (existing?.hits ?? 0) + 1,
        blocked_by: params.blockedBy ?? null,
        expires_at: expiresAt,
      },
      { onConflict: "ip" },
    );

    void logSecurityEvent({
      type: "ip_blocked",
      ip: params.ip,
      severity: params.severity ?? "warn",
      detail: { reason: params.reason, source: params.source ?? "auto" },
    });
  } catch (err) {
    console.error("blockIp falhou (ignorado):", err);
  }
}
