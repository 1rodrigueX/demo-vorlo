import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLeastLoadedMember } from "@/lib/whatsapp/findOrCreateContact";
import { incomingLeadSchema } from "@/lib/validation/lead-webhook";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { normalizePhone, normalizeEmail, isDuplicatePhoneError } from "@/lib/crm/phone";
import { triggerFlows } from "@/lib/automations/runtime";
import { logSecurityEvent } from "@/lib/security/events";
import { findOpenDealForContact, nextPositionInStage } from "@/lib/crm/openDeal";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Endpoint público de captura de lead — o token no path é a autenticação
 * (sem sessão, chamado pelo backend de uma landing page externa ou por um
 * <form action> direto). Cria/atualiza o contato, já cai na coluna do funil
 * configurada no webhook e, se tiver telefone + mensagem de boas-vindas
 * configurada, agenda o envio via automation_jobs (processada por
 * /api/cron/run-automations).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Sem isso, uma mensagem de boas-vindas configurada vira arma de spam via
  // o WhatsApp do tenant (número de terceiro pode ser martelado indefinidamente).
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`leads-token:${token}`, 20, 60_000) || !checkRateLimit(`leads-ip:${ip}`, 30, 60_000)) {
    void logSecurityEvent({
      type: "rate_limited",
      ip,
      userAgent: request.headers.get("user-agent"),
      detail: { endpoint: "public/leads", token: token.slice(0, 8) },
    });
    return NextResponse.json({ error: "Muitas requisições, tente novamente em instantes" }, {
      status: 429,
      headers: CORS_HEADERS,
    });
  }

  const admin = createAdminClient();

  const { data: webhook } = await admin
    .from("lead_webhooks")
    .select("id, tenant_id, name, target_stage_id, welcome_message, is_active, leads_received")
    .eq("token", token)
    .maybeSingle();

  if (!webhook || !webhook.is_active) {
    return NextResponse.json({ error: "Webhook não encontrado" }, { status: 404, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = incomingLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const lead = parsed.data;

  const ownerId = await pickLeastLoadedMember(admin, webhook.tenant_id);
  if (!ownerId) {
    return NextResponse.json({ error: "Empresa sem equipe cadastrada" }, { status: 422, headers: CORS_HEADERS });
  }

  // Dedupe por telefone ou email já existente no tenant, pra não duplicar o
  // mesmo lead a cada novo envio do formulário (retry, dupla submissão etc).
  // A comparação é pelas chaves normalizadas (ver 0070_contact_dedupe): o
  // formulário da landing page raramente manda o telefone no mesmo formato
  // que o CRM guarda.
  const phoneKey = normalizePhone(lead.phone);
  const emailKey = normalizeEmail(lead.email);

  let existingId: string | null = null;
  if (phoneKey) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", webhook.tenant_id)
      .eq("phone_key", phoneKey)
      .maybeSingle();
    existingId = data?.id ?? null;
  }
  if (!existingId && emailKey) {
    // E-mail não é chave única (ver 0070): um contato@empresa.com pode estar
    // em várias pessoas. Reaproveita o mais antigo em vez de criar mais um.
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", webhook.tenant_id)
      .eq("email_key", emailKey)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  let companyId: string | null = null;
  if (lead.company_name) {
    const { data: company } = await admin
      .from("companies")
      .insert({ tenant_id: webhook.tenant_id, name: lead.company_name, created_by: ownerId })
      .select("id")
      .single();
    companyId = company?.id ?? null;
  }

  let contactId = existingId;
  if (!contactId) {
    const { data: contact, error } = await admin
      .from("contacts")
      .insert({
        tenant_id: webhook.tenant_id,
        name: lead.name?.trim() || lead.phone || lead.email || "Lead sem nome",
        email: lead.email || null,
        phone: lead.phone || null,
        lead_source: webhook.name,
        company_id: companyId,
        created_by: ownerId,
      })
      .select("id")
      .single();

    if (contact) {
      contactId = contact.id;
    } else if (isDuplicatePhoneError(error) && phoneKey) {
      // Dois envios simultâneos do mesmo formulário: o índice único barrou o
      // segundo. É o mesmo lead — segue com o que acabou de ser criado.
      const { data: raced } = await admin
        .from("contacts")
        .select("id")
        .eq("tenant_id", webhook.tenant_id)
        .eq("phone_key", phoneKey)
        .maybeSingle();
      if (!raced) {
        return NextResponse.json({ error: "Não foi possível criar o lead" }, { status: 500, headers: CORS_HEADERS });
      }
      contactId = raced.id;
    } else {
      return NextResponse.json({ error: "Não foi possível criar o lead" }, { status: 500, headers: CORS_HEADERS });
    }
  }

  if (webhook.target_stage_id) {
    // O mesmo lead reenviando o formulário não pode virar um segundo card no
    // Kanban. Se já existe negócio aberto, move pra coluna do webhook em vez
    // de criar outro — mesma proteção que o SDR já tinha.
    const openDeal = await findOpenDealForContact(admin, contactId);
    const position = await nextPositionInStage(admin, webhook.target_stage_id);

    if (openDeal) {
      if (openDeal.stage_id !== webhook.target_stage_id) {
        await admin
          .from("deals")
          .update({ stage_id: webhook.target_stage_id, position })
          .eq("id", openDeal.id);
      }
    } else {
      await admin.from("deals").insert({
        tenant_id: webhook.tenant_id,
        title: lead.name?.trim() || lead.phone || lead.email || "Novo lead",
        contact_id: contactId,
        stage_id: webhook.target_stage_id,
        owner_id: ownerId,
        position,
        value: 0,
      });
    }
  }

  await admin
    .from("lead_webhooks")
    .update({ leads_received: webhook.leads_received + 1 })
    .eq("id", webhook.id);

  if (webhook.welcome_message && lead.phone) {
    await admin.from("automation_jobs").insert({
      tenant_id: webhook.tenant_id,
      job_type: "lead_webhook_welcome",
      payload: { contactId, phone: lead.phone, message: webhook.welcome_message },
    });
  }

  // Trajetórias que escutam "novo lead" (ver automations/runtime). Só para
  // lead novo: reenvio do mesmo formulário não deve reiniciar o fluxo.
  if (!existingId) {
    void triggerFlows(admin, webhook.tenant_id, "lead_created", { contactId });
  }

  return NextResponse.json({ ok: true, contactId }, { status: 201, headers: CORS_HEADERS });
}
