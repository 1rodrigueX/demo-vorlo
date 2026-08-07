"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { logSecurityEvent } from "@/lib/security/events";

export type SecurityActionState = { error?: string } | null;

export type SecurityEventRow = {
  id: string;
  event_type: string;
  severity: "info" | "warn" | "critical";
  ip: string | null;
  user_agent: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

export type BlockedIpRow = {
  ip: string;
  reason: string;
  severity: "warn" | "critical";
  source: "auto" | "manual";
  hits: number;
  created_at: string;
  expires_at: string | null;
};

export type SecuritySnapshot = {
  events: SecurityEventRow[];
  blockedIps: BlockedIpRow[];
  counts: { critical24h: number; warn24h: number; total24h: number };
};

/**
 * Estado atual do painel de segurança. Lê via service role — os eventos são da
 * plataforma inteira (inclusive os sem tenant, como login que falhou), e o RLS
 * de dev já barra quem não é do time antes de chegar aqui.
 */
export async function getSecuritySnapshot(): Promise<SecuritySnapshot | { error: string }> {
  if (!(await isCurrentUserDev())) return { error: "Acesso restrito ao time Synexa" };

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const [{ data: events }, { data: blocked }, { data: recent }] = await Promise.all([
    admin
      .from("security_events")
      .select("id, event_type, severity, ip, user_agent, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("blocked_ips").select("*").order("created_at", { ascending: false }),
    admin.from("security_events").select("severity").gte("created_at", since),
  ]);

  const counts = { critical24h: 0, warn24h: 0, total24h: 0 };
  for (const row of recent ?? []) {
    counts.total24h++;
    if (row.severity === "critical") counts.critical24h++;
    else if (row.severity === "warn") counts.warn24h++;
  }

  return {
    events: (events ?? []) as SecurityEventRow[],
    blockedIps: (blocked ?? []) as BlockedIpRow[],
    counts,
  };
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;

export async function blockIpManually(
  ip: string,
  reason: string,
  permanent: boolean,
): Promise<SecurityActionState> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };

  const clean = ip.trim();
  if (!IPV4.test(clean) && !IPV6.test(clean)) return { error: "IP inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: existing } = await admin.from("blocked_ips").select("hits").eq("ip", clean).maybeSingle();

  const { error } = await admin.from("blocked_ips").upsert(
    {
      ip: clean,
      reason: reason.trim() || "Bloqueado manualmente pelo painel",
      severity: "critical",
      source: "manual",
      hits: (existing?.hits ?? 0) + 1,
      blocked_by: user?.id ?? null,
      // Bloqueio manual é permanente por padrão; temporário some em 24h.
      expires_at: permanent ? null : new Date(Date.now() + 24 * 3_600_000).toISOString(),
    },
    { onConflict: "ip" },
  );

  if (error) return { error: "Não foi possível bloquear" };

  void logSecurityEvent({
    type: "ip_blocked",
    ip: clean,
    userId: user?.id,
    severity: "critical",
    detail: { source: "manual", permanent },
  });

  revalidatePath("/dev/seguranca", "page");
  return null;
}

export async function unblockIp(ip: string): Promise<SecurityActionState> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };

  const admin = createAdminClient();
  const { error } = await admin.from("blocked_ips").delete().eq("ip", ip);
  if (error) return { error: "Não foi possível desbloquear" };

  void logSecurityEvent({ type: "ip_unblocked", ip, detail: { source: "manual" } });

  revalidatePath("/dev/seguranca", "page");
  return null;
}
