"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { enqueueCampaignTick, type CampaignAudience } from "@/lib/campaigns/runtime";

export type CampaignActionState = { error?: string } | null;

const audienceSchema = z.object({
  stageIds: z.array(z.uuid()).max(50).optional(),
  tagIds: z.array(z.uuid()).max(50).optional(),
  ownerIds: z.array(z.uuid()).max(50).optional(),
  onlyWithPhone: z.boolean().optional(),
});

const campaignSchema = z.object({
  name: z.string().trim().min(3, "Dê um nome à campanha").max(120),
  message: z.string().trim().min(5, "Escreva a mensagem").max(1200),
  variants: z.array(z.string().trim().max(1200)).max(4).optional(),
  audience: audienceSchema,
  startAt: z.string().optional(),
  batchSize: z.number().int().min(1).max(15).optional(),
  dailyCap: z.number().int().min(1).max(1000).optional(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

type AdminContext =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; tenantId: string; userId: string };

async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { ok: false, error: "Tenant não encontrado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile && !["owner", "manager"].includes(profile.role)) {
    return { ok: false, error: "Só o dono ou um gerente pode criar disparos" };
  }

  return { ok: true, supabase, tenantId, userId: user.id };
}

/**
 * Contatos que a audiência alcança. Roda com a service role porque o dono
 * precisa ver o alcance real da base — inclusive contatos de outros
 * vendedores, que o RLS esconderia dele numa consulta normal.
 */
async function resolveAudience(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  audience: CampaignAudience,
): Promise<string[]> {
  let query = admin.from("contacts").select("id").eq("tenant_id", tenantId).is("opted_out_at", null);

  // Sem telefone não há disparo de WhatsApp possível.
  if (audience.onlyWithPhone !== false) query = query.not("phone_key", "is", null);
  if (audience.ownerIds?.length) query = query.in("created_by", audience.ownerIds);

  const { data: contacts } = await query;
  let ids = (contacts ?? []).map((c) => c.id);
  if (!ids.length) return [];

  if (audience.tagIds?.length) {
    const { data: tagged } = await admin
      .from("contact_tags")
      .select("contact_id")
      .eq("tenant_id", tenantId)
      .in("tag_id", audience.tagIds);
    const allowed = new Set((tagged ?? []).map((row) => row.contact_id));
    ids = ids.filter((id) => allowed.has(id));
  }

  if (audience.stageIds?.length) {
    const { data: deals } = await admin
      .from("deals")
      .select("contact_id")
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .in("stage_id", audience.stageIds);
    const allowed = new Set((deals ?? []).map((row) => row.contact_id));
    ids = ids.filter((id) => allowed.has(id));
  }

  return ids;
}

/** Quantos receberiam — mostrado antes de agendar, pra ninguém disparar às cegas. */
export async function previewAudience(
  audience: CampaignAudience,
): Promise<{ total: number } | { error: string }> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { error: ctx.error };

  const parsed = audienceSchema.safeParse(audience);
  if (!parsed.success) return { error: "Filtros inválidos" };

  const ids = await resolveAudience(createAdminClient(), ctx.tenantId, parsed.data);
  return { total: ids.length };
}

export async function createCampaign(input: CampaignInput): Promise<{ error?: string; id?: string }> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { error: ctx.error };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { data, error } = await ctx.supabase
    .from("campaigns")
    .insert({
      tenant_id: ctx.tenantId,
      name: parsed.data.name,
      message: parsed.data.message,
      variants: (parsed.data.variants ?? []).filter((v) => v.trim().length > 0),
      audience: parsed.data.audience,
      schedule: parsed.data.startAt ? { startAt: parsed.data.startAt } : {},
      throttle: { batchSize: parsed.data.batchSize ?? 5, dailyCap: parsed.data.dailyCap ?? 200 },
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createCampaign failed:", error);
    return { error: `Não foi possível criar: ${error?.message ?? "erro desconhecido"}` };
  }

  revalidatePath("/[tenantSlug]/disparos", "page");
  return { id: data.id };
}

/**
 * Agenda o disparo: congela a audiência em campaign_recipients e coloca a
 * primeira rodada na fila. A partir daqui a lista não muda — quem entrar na
 * base depois não recebe, e é isso que permite responder "quem já recebeu?".
 */
export async function scheduleCampaign(campaignId: string): Promise<{ error?: string; total?: number }> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { error: ctx.error };

  const { data: campaign } = await ctx.supabase
    .from("campaigns")
    .select("id, status, audience")
    .eq("id", campaignId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  if (!campaign) return { error: "Campanha não encontrada" };
  if (campaign.status !== "draft" && campaign.status !== "paused") {
    return { error: "Esta campanha já foi agendada" };
  }

  const admin = createAdminClient();
  const ids = await resolveAudience(admin, ctx.tenantId, (campaign.audience ?? {}) as CampaignAudience);
  if (!ids.length) return { error: "Nenhum contato bate com os filtros escolhidos" };

  // onConflict: reagendar uma campanha pausada não reenvia pra quem já recebeu.
  const { error: insertError } = await admin.from("campaign_recipients").upsert(
    ids.map((contactId) => ({
      campaign_id: campaign.id,
      tenant_id: ctx.tenantId,
      contact_id: contactId,
    })),
    { onConflict: "campaign_id,contact_id", ignoreDuplicates: true },
  );

  if (insertError) {
    console.error("scheduleCampaign failed:", insertError);
    return { error: "Não foi possível montar a lista de destinatários" };
  }

  await admin.from("campaigns").update({ status: "scheduled", error: null }).eq("id", campaign.id);
  await enqueueCampaignTick(admin, ctx.tenantId, campaign.id);

  revalidatePath("/[tenantSlug]/disparos", "page");
  return { total: ids.length };
}

/** Pausa: as rodadas seguintes param de enviar (a checagem é no início de cada uma). */
export async function pauseCampaign(campaignId: string): Promise<CampaignActionState> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("campaigns")
    .update({ status: "paused" })
    .eq("id", campaignId)
    .eq("tenant_id", ctx.tenantId)
    .in("status", ["scheduled", "running"]);

  if (error) return { error: "Não foi possível pausar" };

  revalidatePath("/[tenantSlug]/disparos", "page");
  return null;
}

export async function cancelCampaign(campaignId: string): Promise<CampaignActionState> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("campaigns")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("tenant_id", ctx.tenantId)
    .in("status", ["draft", "scheduled", "running", "paused"]);

  if (error) return { error: "Não foi possível cancelar" };

  revalidatePath("/[tenantSlug]/disparos", "page");
  return null;
}

export async function deleteCampaign(campaignId: string): Promise<CampaignActionState> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("tenant_id", ctx.tenantId)
    .in("status", ["draft", "canceled", "done"]);

  if (error) return { error: "Não foi possível apagar (campanha em andamento precisa ser cancelada antes)" };

  revalidatePath("/[tenantSlug]/disparos", "page");
  return null;
}
