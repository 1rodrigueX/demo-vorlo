"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { getBaileysState } from "@/lib/whatsapp/baileysClient";
import { putObject, getObject, deleteObject } from "@/lib/storage";

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
  const { data: openaiIntegration } = await admin
    .from("tenant_integrations")
    .select("status, last_error")
    .eq("tenant_id", tenantId)
    .eq("provider", "openai")
    .maybeSingle();

  checks.push({
    id: "ia",
    label: "Inteligência artificial",
    status: !openaiIntegration ? "off" : openaiIntegration.status === "connected" ? "ok" : "error",
    detail: !openaiIntegration
      ? "Sem chave da OpenAI. O SDR e o 'criar trajetória com IA' ficam indisponíveis."
      : openaiIntegration.status === "connected"
        ? "Chave válida."
        : (openaiIntegration.last_error ?? "A última verificação da chave falhou."),
    action: openaiIntegration?.status === "connected" ? undefined : "Configurações › Integrações › Inteligência Artificial.",
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

// ══════════════════════════════════════════════════════════════════════════
//  Status da PLATAFORMA (o CRM em si), separado do status da CONTA acima.
//
//  O de cima responde "a minha configuração está completa?". Este responde "o
//  serviço está no ar e as APIs de que ele depende estão respondendo?" — app,
//  banco, armazenamento e conectividade externa. É o que o dono pediu: saber
//  se o CRM está online ou com instabilidade em alguma API, sem abrir chamado.
// ══════════════════════════════════════════════════════════════════════════

export type PlatformOverall = "operational" | "degraded" | "down";

export type PlatformStatus = {
  overall: PlatformOverall;
  checkedAt: string;
  checks: DiagnosticCheck[];
};

/** Bate num host e diz se respondeu a tempo. Qualquer resposta HTTP (mesmo 401/404) conta como "no ar" — só a rede importa aqui, não o status. */
async function pingHost(url: string, timeoutMs = 2500): Promise<{ up: boolean; ms: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // HEAD é o mais barato; alguns hosts não aceitam e caem no catch como
    // "fora" — por isso usamos GET, que qualquer endpoint responde.
    await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
    return { up: true, ms: Date.now() - started };
  } catch {
    return { up: false, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function pingCheck(
  id: string,
  label: string,
  detailUp: string,
  { up, ms }: { up: boolean; ms: number },
): DiagnosticCheck {
  // Lento mas responde = instabilidade (warn); não responde = fora (error).
  const slow = up && ms > 1500;
  return {
    id,
    label,
    status: !up ? "error" : slow ? "warn" : "ok",
    detail: !up
      ? "Sem resposta — pode ser instabilidade da API ou do link do servidor."
      : slow
        ? `${detailUp} Resposta lenta (${ms} ms).`
        : `${detailUp} (${ms} ms)`,
    action: up ? undefined : "Se persistir, é instabilidade do provedor — normalmente se resolve sozinho em minutos.",
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export async function getPlatformStatus(): Promise<PlatformStatus | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = createAdminClient();
  const checks: DiagnosticCheck[] = [];

  // ── Servidor da aplicação ────────────────────────────────────────────────
  // Se este código está rodando, a app respondeu. Mostra há quanto tempo o
  // processo está de pé (reinício recente costuma explicar "sumiu tudo").
  const uptime = process.uptime();
  checks.push({
    id: "app",
    label: "Servidor da aplicação",
    status: "ok",
    detail: `No ar há ${formatUptime(uptime)}.`,
  });

  // ── Banco de dados (latência) ────────────────────────────────────────────
  const dbStarted = Date.now();
  let dbOk = true;
  try {
    await admin.from("tenants").select("id", { count: "exact", head: true });
  } catch {
    dbOk = false;
  }
  const dbMs = Date.now() - dbStarted;
  checks.push({
    id: "db",
    label: "Banco de dados",
    status: !dbOk ? "error" : dbMs > 800 ? "warn" : "ok",
    detail: !dbOk
      ? "O banco não respondeu. O CRM fica indisponível até normalizar."
      : dbMs > 800
        ? `Respondendo devagar (${dbMs} ms) — sinal de instabilidade.`
        : `Respondendo normalmente (${dbMs} ms).`,
    action: dbOk ? undefined : "Instabilidade grave — acione o suporte se não normalizar em minutos.",
  });

  // ── Armazenamento de arquivos (probe real) ───────────────────────────────
  // Grava, lê e apaga um arquivinho: prova que anexos, áudios e logos estão
  // sendo salvos de verdade — não só que o disco existe.
  const probePath = `health/${randomUUID()}.txt`;
  let storageOk = false;
  try {
    const { error } = await putObject("company-assets", probePath, Buffer.from("ok"), "text/plain");
    if (!error) {
      const back = await getObject("company-assets", probePath);
      storageOk = back?.toString() === "ok";
    }
  } catch {
    storageOk = false;
  } finally {
    void deleteObject("company-assets", probePath).catch(() => {});
  }
  checks.push({
    id: "storage",
    label: "Armazenamento de arquivos",
    status: storageOk ? "ok" : "error",
    detail: storageOk
      ? "Anexos, áudios e imagens estão sendo salvos normalmente."
      : "Falha ao gravar/ler arquivo. Envio de anexos e áudios pode falhar.",
    action: storageOk ? undefined : "Instabilidade no armazenamento — acione o suporte.",
  });

  // ── APIs externas (em paralelo, com timeout curto) ───────────────────────
  const [openaiPing, google, microsoft] = await Promise.all([
    pingHost("https://api.openai.com/"),
    pingHost("https://gmail.googleapis.com/"),
    pingHost("https://graph.microsoft.com/"),
  ]);

  checks.push(pingCheck("api-ia", "API de Inteligência Artificial", "OpenAI respondendo.", openaiPing));

  // E-mail (Gmail/Outlook) e OAuth do Google dependem desses dois hosts. Se os
  // dois caírem juntos, é o link do servidor — não a API do provedor.
  const emailUp = google.up || microsoft.up;
  checks.push({
    id: "api-email",
    label: "APIs de e-mail (Google / Microsoft)",
    status: emailUp ? (google.up && microsoft.up ? "ok" : "warn") : "error",
    detail: emailUp
      ? google.up && microsoft.up
        ? "Google e Microsoft respondendo."
        : `Instabilidade em ${google.up ? "Microsoft" : "Google"} — a outra está no ar.`
      : "Google e Microsoft sem resposta — provável instabilidade do link do servidor.",
    action: emailUp ? undefined : "Se persistir, o sync de e-mail pode atrasar. Costuma normalizar sozinho.",
  });

  // ── Veredito geral ───────────────────────────────────────────────────────
  // App/banco/armazenamento fora = CRM "down". Só uma API instável = "degraded".
  const core = checks.filter((c) => ["app", "db", "storage"].includes(c.id));
  const overall: PlatformOverall = core.some((c) => c.status === "error")
    ? "down"
    : checks.some((c) => c.status === "error" || c.status === "warn")
      ? "degraded"
      : "operational";

  return { overall, checkedAt: new Date().toISOString(), checks };
}
