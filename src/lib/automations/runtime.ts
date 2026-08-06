import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseGraph, type FlowGraph, type FlowNode } from "@/lib/automations/flow-types";
import { applyTagToContact } from "@/lib/automations/funnel";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { recordOutboundMessage } from "@/lib/whatsapp/recordOutboundMessage";
import type { Json } from "@/types/database.types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Execução das trajetórias (Fase 2 da 0069, ver 0072_flow_runtime).
 *
 * Um passo por job na fila automation_jobs: o cron chama advanceFlowRun, que
 * executa UM nó e agenda o próximo. Nunca um laço longo — assim "esperar 2
 * dias" é só um job com run_at no futuro, e a VPS pode reiniciar no meio sem
 * perder nada.
 */

/** Teto de nós por execução. Um grafo com ciclo (A→B→A) mandaria mensagem pra sempre. */
const MAX_STEPS = 50;

/** Janela em que automação pode mandar mensagem, hora local do Brasil. */
const QUIET_HOURS_START = 20; // 20h em diante, não manda
const QUIET_HOURS_END = 8; // até 8h, não manda
/** O Brasil não tem mais horário de verão desde 2019, então o offset é estável. */
const BR_UTC_OFFSET_HOURS = -3;

export type FlowTriggerKind = "lead_created" | "stage_changed" | "message_received";

export type TriggerContext = {
  contactId: string;
  dealId?: string | null;
  /** Só para stage_changed: em qual etapa o negócio entrou. */
  stageId?: string | null;
};

/**
 * Chamado dos pontos do CRM onde a coisa acontece (contato criado, negócio
 * mudou de etapa, mensagem chegou). Abre uma execução para cada trajetória
 * ativa que escuta esse gatilho.
 *
 * Nunca lança: uma trajetória mal configurada não pode derrubar o cadastro de
 * um lead nem o recebimento de uma mensagem. Quem chama usa `void`.
 */
export async function triggerFlows(
  admin: Admin,
  tenantId: string,
  kind: FlowTriggerKind,
  ctx: TriggerContext,
): Promise<void> {
  try {
    const { data: flows } = await admin
      .from("automation_flows")
      .select("id, graph")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    if (!flows?.length) return;

    for (const flow of flows) {
      const graph = parseGraph(flow.graph);
      const trigger = graph.nodes.find((n) => n.type === "trigger" && n.kind === kind);
      if (!trigger) continue;

      // "Mudou de etapa" com etapa escolhida só dispara naquela etapa.
      if (kind === "stage_changed") {
        const wanted = String(trigger.config?.stageId ?? "").trim();
        if (wanted && wanted !== ctx.stageId) continue;
      }

      const firstAction = nextNodeId(graph, trigger.id);
      if (!firstAction) continue; // gatilho solto, sem nenhuma ação ligada

      await startRun(admin, tenantId, flow.id, graph, firstAction, ctx);
    }
  } catch (err) {
    console.error("triggerFlows falhou", tenantId, kind, err);
  }
}

async function startRun(
  admin: Admin,
  tenantId: string,
  flowId: string,
  graph: FlowGraph,
  firstNodeId: string,
  ctx: TriggerContext,
): Promise<void> {
  const { data: run, error } = await admin
    .from("flow_runs")
    .insert({
      tenant_id: tenantId,
      flow_id: flowId,
      contact_id: ctx.contactId,
      deal_id: ctx.dealId ?? null,
      // Congela o grafo: editar a trajetória não quebra quem já está no meio.
      graph_snapshot: graph as unknown as Json,
      current_node_id: firstNodeId,
      status: "running",
    })
    .select("id")
    .single();

  // Índice único de execução ativa: o lead já está nessa trajetória. Não é
  // erro, é a trava funcionando (ver 0072).
  if (error || !run) return;

  await enqueueFlowStep(admin, tenantId, run.id);
}

/** Coloca o próximo passo na fila que o cron já processa. */
export async function enqueueFlowStep(
  admin: Admin,
  tenantId: string,
  runId: string,
  runAt: Date = new Date(),
): Promise<void> {
  await admin.from("automation_jobs").insert({
    tenant_id: tenantId,
    job_type: "flow_step",
    run_at: runAt.toISOString(),
    payload: { runId },
  });
}

type NodeOutcome =
  | { kind: "done"; detail?: string }
  /** Executou e o próximo passo só pode rodar daqui a X (o nó "esperar"). */
  | { kind: "done"; detail?: string; delayMs: number }
  /** NÃO executou: tenta de novo mais tarde, no mesmo nó (fora do horário permitido). */
  | { kind: "defer"; delayMs: number; detail: string }
  /** Encerra a execução aqui (lead descadastrado, dado que sumiu). */
  | { kind: "stop"; detail: string };

/** Executa o nó atual da execução e agenda o próximo. Chamado pelo cron. */
export async function advanceFlowRun(admin: Admin, runId: string): Promise<void> {
  const { data: run } = await admin
    .from("flow_runs")
    .select("id, tenant_id, flow_id, contact_id, deal_id, graph_snapshot, current_node_id, status, steps_taken")
    .eq("id", runId)
    .maybeSingle();

  if (!run) return;
  if (run.status !== "running" && run.status !== "waiting") return; // cancelada/terminada

  if (run.steps_taken >= MAX_STEPS) {
    await finishRun(admin, run.id, "failed", `Parou em ${MAX_STEPS} passos — a trajetória provavelmente tem um laço.`);
    return;
  }

  const graph = parseGraph(run.graph_snapshot);
  const node = graph.nodes.find((n) => n.id === run.current_node_id);
  if (!node) {
    await finishRun(admin, run.id, "done");
    return;
  }

  let outcome: NodeOutcome;
  try {
    outcome = await executeNode(admin, run, node);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    await recordStep(admin, run.tenant_id, run.id, node, "failed", message);
    await finishRun(admin, run.id, "failed", message);
    return;
  }

  if (outcome.kind === "stop") {
    await recordStep(admin, run.tenant_id, run.id, node, "skipped", outcome.detail);
    await finishRun(admin, run.id, "done", outcome.detail);
    return;
  }

  if (outcome.kind === "defer") {
    // Não avança o nó nem conta passo: volta pra este mesmo nó mais tarde.
    await admin
      .from("flow_runs")
      .update({ status: "waiting", updated_at: new Date().toISOString() })
      .eq("id", run.id);
    await enqueueFlowStep(admin, run.tenant_id, run.id, new Date(Date.now() + outcome.delayMs));
    return;
  }

  await recordStep(admin, run.tenant_id, run.id, node, "done", outcome.detail);

  const nextId = nextNodeId(graph, node.id);
  if (!nextId) {
    await finishRun(admin, run.id, "done");
    return;
  }

  const delayMs = "delayMs" in outcome ? outcome.delayMs : 0;
  await admin
    .from("flow_runs")
    .update({
      current_node_id: nextId,
      steps_taken: run.steps_taken + 1,
      status: delayMs > 0 ? "waiting" : "running",
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  await enqueueFlowStep(admin, run.tenant_id, run.id, new Date(Date.now() + delayMs));
}

type RunRow = {
  id: string;
  tenant_id: string;
  flow_id: string;
  contact_id: string;
  deal_id: string | null;
};

async function executeNode(admin: Admin, run: RunRow, node: FlowNode): Promise<NodeOutcome> {
  switch (node.kind) {
    case "send_whatsapp":
      return sendWhatsAppNode(admin, run, node);
    case "wait":
      return { kind: "done", detail: describeWait(node), delayMs: waitDelayMs(node) };
    case "move_stage":
      return moveStageNode(admin, run, node);
    case "assign_user":
      return assignUserNode(admin, run, node);
    case "add_tag":
      return addTagNode(admin, run, node);
    case "create_task":
      return createTaskNode(admin, run, node);
    case "custom":
      // Passo "Personalizado" é só uma anotação no desenho — não executa nada.
      return { kind: "done", detail: String(node.config?.note ?? "") || "Passo personalizado (sem ação)" };
    default:
      return { kind: "done", detail: `Tipo de passo desconhecido: ${node.kind}` };
  }
}

async function sendWhatsAppNode(admin: Admin, run: RunRow, node: FlowNode): Promise<NodeOutcome> {
  const template = String(node.config?.message ?? "").trim();
  if (!template) return { kind: "done", detail: "Mensagem vazia — nada enviado" };

  const { data: contact } = await admin
    .from("contacts")
    .select("name, phone, opted_out_at")
    .eq("id", run.contact_id)
    .maybeSingle();

  if (!contact) return { kind: "stop", detail: "Contato não existe mais" };
  if (contact.opted_out_at) return { kind: "stop", detail: "Lead pediu para não receber mensagens" };
  if (!contact.phone) return { kind: "done", detail: "Contato sem telefone — nada enviado" };

  // Automação não acorda cliente de madrugada. Fora da janela, o passo volta
  // pra fila no próximo horário permitido em vez de executar.
  const defer = msUntilSendWindow(new Date());
  if (defer > 0) {
    return { kind: "defer", delayMs: defer, detail: "Fora do horário de envio" };
  }

  const message = renderMessage(template, contact.name);
  const result = await sendWhatsAppMessage(run.tenant_id, contact.phone, message);
  await recordOutboundMessage(admin, run.tenant_id, run.contact_id, message, result);

  return { kind: "done", detail: `Mensagem enviada para ${contact.phone}` };
}

async function moveStageNode(admin: Admin, run: RunRow, node: FlowNode): Promise<NodeOutcome> {
  const stageId = String(node.config?.stageId ?? "").trim();
  if (!stageId) return { kind: "done", detail: "Etapa não configurada" };

  const dealId = await resolveDealId(admin, run);
  if (!dealId) return { kind: "done", detail: "Lead sem negócio aberto — nada movido" };

  const { data: stage } = await admin
    .from("pipeline_stages")
    .select("name")
    .eq("id", stageId)
    .eq("tenant_id", run.tenant_id)
    .maybeSingle();
  if (!stage) return { kind: "done", detail: "Etapa não existe mais" };

  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", stageId);

  await admin.from("deals").update({ stage_id: stageId, position: count ?? 0 }).eq("id", dealId);

  await admin.from("activities").insert({
    tenant_id: run.tenant_id,
    contact_id: run.contact_id,
    deal_id: dealId,
    type: "stage_change",
    body: `Negócio movido para "${stage.name}" (trajetória)`,
    created_by: null,
  });

  return { kind: "done", detail: `Movido para "${stage.name}"` };
}

async function assignUserNode(admin: Admin, run: RunRow, node: FlowNode): Promise<NodeOutcome> {
  const userId = String(node.config?.userId ?? "").trim();
  if (!userId) return { kind: "done", detail: "Responsável não configurado" };

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("id", userId)
    .eq("tenant_id", run.tenant_id)
    .maybeSingle();
  if (!profile) return { kind: "done", detail: "Responsável não faz mais parte da equipe" };

  await admin.from("contacts").update({ created_by: userId }).eq("id", run.contact_id);
  // Só os negócios abertos: não reescreve quem fechou um negócio no passado.
  await admin
    .from("deals")
    .update({ owner_id: userId })
    .eq("contact_id", run.contact_id)
    .eq("status", "open");

  return { kind: "done", detail: `Responsável: ${profile.full_name ?? "sem nome"}` };
}

async function addTagNode(admin: Admin, run: RunRow, node: FlowNode): Promise<NodeOutcome> {
  const tagName = String(node.config?.tagName ?? "").trim();
  if (!tagName) return { kind: "done", detail: "Tag não configurada" };

  await applyTagToContact(admin, run.tenant_id, run.contact_id, tagName);
  return { kind: "done", detail: `Tag "${tagName}" aplicada` };
}

async function createTaskNode(admin: Admin, run: RunRow, node: FlowNode): Promise<NodeOutcome> {
  const title = String(node.config?.title ?? "").trim();
  if (!title) return { kind: "done", detail: "Tarefa sem título" };

  await admin.from("lead_tasks").insert({
    tenant_id: run.tenant_id,
    contact_id: run.contact_id,
    title,
    created_by: null,
  });

  return { kind: "done", detail: `Tarefa criada: ${title}` };
}

/**
 * Negócio da execução: o que veio no gatilho, senão o negócio aberto mais
 * recente do lead.
 */
async function resolveDealId(admin: Admin, run: RunRow): Promise<string | null> {
  if (run.deal_id) return run.deal_id;

  const { data } = await admin
    .from("deals")
    .select("id")
    .eq("contact_id", run.contact_id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/** Primeiro nó ligado à saída deste. */
function nextNodeId(graph: FlowGraph, fromId: string): string | null {
  const edge = graph.edges.find((e) => e.source === fromId);
  return edge?.target ?? null;
}

function waitDelayMs(node: FlowNode): number {
  const amount = Number(node.config?.amount);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
  const unit = String(node.config?.unit ?? "hours");

  const multiplier = unit === "minutes" ? 60_000 : unit === "days" ? 86_400_000 : 3_600_000;
  return safeAmount * multiplier;
}

function describeWait(node: FlowNode): string {
  const amount = Number(node.config?.amount) || 1;
  const unit = String(node.config?.unit ?? "hours");
  const label = unit === "minutes" ? "minuto" : unit === "days" ? "dia" : "hora";
  return `Esperando ${amount} ${label}${amount === 1 ? "" : "s"}`;
}

/** Mesma substituição de {nome} das automações de funil. */
function renderMessage(template: string, contactName: string | null): string {
  const firstName = (contactName ?? "").trim().split(/\s+/)[0] || "";
  return template.replaceAll("{nome}", firstName);
}

/**
 * Quanto falta (ms) até a janela de envio abrir. Zero se já pode enviar.
 * Exportada para o disparo em massa reusar a mesma regra.
 */
export function msUntilSendWindow(now: Date): number {
  const brHour = (now.getUTCHours() + 24 + BR_UTC_OFFSET_HOURS) % 24;
  if (brHour >= QUIET_HOURS_END && brHour < QUIET_HOURS_START) return 0;

  const hoursUntilOpen = brHour >= QUIET_HOURS_START ? 24 - brHour + QUIET_HOURS_END : QUIET_HOURS_END - brHour;
  // Desconta os minutos já corridos da hora atual pra não empurrar demais.
  return hoursUntilOpen * 3_600_000 - now.getUTCMinutes() * 60_000;
}

async function recordStep(
  admin: Admin,
  tenantId: string,
  runId: string,
  node: FlowNode,
  status: "done" | "skipped" | "failed",
  detail?: string,
): Promise<void> {
  await admin.from("flow_run_steps").insert({
    run_id: runId,
    tenant_id: tenantId,
    node_id: node.id,
    kind: node.kind,
    status,
    detail: detail ?? null,
  });
}

async function finishRun(
  admin: Admin,
  runId: string,
  status: "done" | "failed",
  error?: string,
): Promise<void> {
  await admin
    .from("flow_runs")
    .update({
      status,
      error: status === "failed" ? (error ?? null) : null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);
}
