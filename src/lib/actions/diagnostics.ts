"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { getBaileysState } from "@/lib/whatsapp/baileysClient";

/**
 * Diagnóstico do CRM: o que está funcionando, o que está pela metade e o que
 * fazer a respeito.
 *
 * Existe porque quase toda "falha" relatada até aqui foi configuração faltando,
 * não defeito: cron parado faz a trajetória nunca rodar, chave da IA ausente
 * faz o SDR ficar mudo, remetente sem domínio verificado faz o e-mail sumir.
 * Nenhum desses avisa sozinho — o usuário só vê "não funciona".
 */

export type CheckStatus = "ok" | "warn" | "off" | "error";

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** O que fazer quando não está ok. */
  action?: string;
};

export type DiagnosticsResult = { checks: DiagnosticCheck[] } | { error: string };

/** Um job processado nas últimas horas prova que o cron está de pé. */
const CRON_STALE_HOURS = 2;

export async function runDiagnostics(): Promise<DiagnosticsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const admin = createAdminClient();
  const checks: DiagnosticCheck[] = [];

  // ── WhatsApp ────────────────────────────────────────────────────────────
  // Não existe coluna de status: no Baileys a conexão é estado vivo do
  // processo (por isso getBaileysState), e no Twilio "configurado" é ter as
  // três credenciais preenchidas.
  const { data: whatsapp } = await admin
    .from("whatsapp_connections")
    .select("provider, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!whatsapp) {
    checks.push({
      id: "whatsapp",
      label: "WhatsApp",
      status: "off",
      detail: "Nenhuma conexão configurada.",
      action: "Configurações › Integrações › WhatsApp.",
    });
  } else if (whatsapp.provider === "twilio") {
    const complete = Boolean(
      whatsapp.twilio_account_sid && whatsapp.twilio_auth_token && whatsapp.twilio_whatsapp_number,
    );
    checks.push({
      id: "whatsapp",
      label: "WhatsApp (Twilio)",
      status: complete ? "ok" : "error",
      detail: complete ? "Credenciais preenchidas." : "Faltam credenciais do Twilio.",
      action: complete ? undefined : "Complete em Configurações › Integrações › WhatsApp.",
    });
  } else {
    const live = getBaileysState(tenantId);
    checks.push({
      id: "whatsapp",
      label: "WhatsApp (QR Code)",
      status: live.status === "connected" ? "ok" : "error",
      detail:
        live.status === "connected"
          ? `Conectado${live.phoneNumber ? ` no número ${live.phoneNumber}` : ""}.`
          : live.status === "qr"
            ? "Esperando a leitura do QR Code."
            : "Desconectado — nenhuma mensagem entra ou sai agora.",
      action: live.status === "connected" ? undefined : "Leia o QR Code em Configurações › Integrações.",
    });
  }

  // ── Inteligência artificial ─────────────────────────────────────────────
  const { data: anthropic } = await admin
    .from("tenant_integrations")
    .select("status, last_error")
    .eq("tenant_id", tenantId)
    .eq("provider", "anthropic")
    .maybeSingle();

  checks.push({
    id: "ia",
    label: "Inteligência artificial",
    status: !anthropic ? "off" : anthropic.status === "connected" ? "ok" : "error",
    detail: !anthropic
      ? "Sem chave da Anthropic. O SDR e o 'criar trajetória com IA' ficam indisponíveis."
      : anthropic.status === "connected"
        ? "Chave válida."
        : (anthropic.last_error ?? "A última verificação da chave falhou."),
    action: anthropic?.status === "connected" ? undefined : "Configurações › Integrações › Inteligência Artificial.",
  });

  // ── Automações (o cron) ─────────────────────────────────────────────────
  // O item mais importante da lista: sem cron, trajetória, disparo e
  // importação ficam parados sem dar nenhum sinal.
  const since = new Date(Date.now() - CRON_STALE_HOURS * 3_600_000).toISOString();
  const [{ count: recentlyProcessed }, { count: pendingJobs }] = await Promise.all([
    admin
      .from("automation_jobs")
      .select("id", { count: "exact", head: true })
      .not("processed_at", "is", null)
      .gte("processed_at", since),
    admin
      .from("automation_jobs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .lte("run_at", new Date().toISOString()),
  ]);

  const cronAlive = (recentlyProcessed ?? 0) > 0;
  const stuck = pendingJobs ?? 0;

  checks.push({
    id: "cron",
    label: "Automações (trajetórias e disparos)",
    status: cronAlive ? "ok" : stuck > 0 ? "error" : "warn",
    detail: cronAlive
      ? "O processador de automações rodou há pouco."
      : stuck > 0
        ? `${stuck} ${stuck === 1 ? "tarefa parada" : "tarefas paradas"} esperando. O processador não está rodando.`
        : `Sem sinal do processador nas últimas ${CRON_STALE_HOURS} horas (pode ser só falta de trabalho).`,
    action: cronAlive ? undefined : "Fale com o suporte: o serviço de automações do servidor precisa ser religado.",
  });

  // ── Funil ───────────────────────────────────────────────────────────────
  const { count: stageCount } = await admin
    .from("pipeline_stages")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  checks.push({
    id: "funil",
    label: "Funil de vendas",
    status: (stageCount ?? 0) > 0 ? "ok" : "error",
    detail: (stageCount ?? 0) > 0 ? `${stageCount} etapas configuradas.` : "Nenhuma etapa no funil.",
    action: (stageCount ?? 0) > 0 ? undefined : "Crie as etapas em Configurações.",
  });

  // ── Kommo ───────────────────────────────────────────────────────────────
  const { data: kommo } = await admin
    .from("tenant_integrations")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("provider", "kommo")
    .maybeSingle();

  checks.push({
    id: "kommo",
    label: "Importação do Kommo",
    status: !kommo ? "off" : kommo.status === "connected" ? "ok" : "error",
    detail: !kommo
      ? "Não conectado (opcional — só se você veio de outro CRM)."
      : kommo.status === "connected"
        ? "Conectado."
        : "Conectado antes, mas a última verificação falhou.",
    action: kommo && kommo.status !== "connected" ? "Revise o token em Configurações › Integrações." : undefined,
  });

  // ── E-mail ──────────────────────────────────────────────────────────────
  const { data: emailIntegration } = await admin
    .from("tenant_integrations")
    .select("provider, access_token")
    .eq("tenant_id", tenantId)
    .in("provider", ["gmail", "outlook"])
    .limit(1)
    .maybeSingle();

  checks.push({
    id: "email",
    label: "Canal de e-mail",
    status: emailIntegration?.access_token ? "ok" : "off",
    detail: emailIntegration?.access_token
      ? `${emailIntegration.provider === "gmail" ? "Gmail" : "Outlook"} conectado.`
      : "Nenhuma conta conectada (opcional).",
    action: emailIntegration?.access_token ? undefined : "Configurações › Integrações › E-mail.",
  });

  // ── Descadastrados ──────────────────────────────────────────────────────
  const { count: optedOut } = await admin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .not("opted_out_at", "is", null);

  if ((optedOut ?? 0) > 0) {
    checks.push({
      id: "optout",
      label: "Leads descadastrados",
      status: "warn",
      detail: `${optedOut} ${optedOut === 1 ? "lead pediu" : "leads pediram"} para não receber mensagens automáticas.`,
      action: "Eles ficam fora de trajetórias e disparos automaticamente.",
    });
  }

  return { checks };
}
