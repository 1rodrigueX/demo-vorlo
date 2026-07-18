import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLeastLoadedMember } from "@/lib/whatsapp/findOrCreateContact";
import { incomingLeadSchema } from "@/lib/validation/lead-webhook";

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
  let existingId: string | null = null;
  if (lead.phone) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", webhook.tenant_id)
      .eq("phone", lead.phone)
      .maybeSingle();
    existingId = data?.id ?? null;
  }
  if (!existingId && lead.email) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", webhook.tenant_id)
      .eq("email", lead.email)
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
    if (error || !contact) {
      return NextResponse.json({ error: "Não foi possível criar o lead" }, { status: 500, headers: CORS_HEADERS });
    }
    contactId = contact.id;
  }

  if (webhook.target_stage_id) {
    const { count } = await admin
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("stage_id", webhook.target_stage_id);

    await admin.from("deals").insert({
      tenant_id: webhook.tenant_id,
      title: lead.name?.trim() || lead.phone || lead.email || "Novo lead",
      contact_id: contactId,
      stage_id: webhook.target_stage_id,
      owner_id: ownerId,
      position: count ?? 0,
      value: 0,
    });
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

  return NextResponse.json({ ok: true, contactId }, { status: 201, headers: CORS_HEADERS });
}
