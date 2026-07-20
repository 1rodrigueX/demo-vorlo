import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

async function findStageByName(
  admin: Admin,
  tenantId: string,
  name: string,
): Promise<{ id: string; is_lost: boolean } | null> {
  const { data } = await admin
    .from("pipeline_stages")
    .select("id, is_lost")
    .eq("tenant_id", tenantId)
    .ilike("name", name)
    .maybeSingle();
  return data;
}

async function findOpenDealForContact(admin: Admin, contactId: string): Promise<{ id: string } | null> {
  const { data } = await admin
    .from("deals")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Garante que o lead já aparece no pipeline (etapa "Atendimento SDR") assim
 * que a IA começa a conversar, mesmo antes do cadastro terminar. Não mexe
 * se já existe negócio aberto pra esse contato (pode já ter sido criado ou
 * movido manualmente por um humano — a SDR nunca sobrescreve isso).
 */
export async function ensureLeadInSdrStage(
  admin: Admin,
  tenantId: string,
  contactId: string,
  sellerId: string,
  contactName: string,
): Promise<void> {
  try {
    const existing = await findOpenDealForContact(admin, contactId);
    if (existing) return;

    const stage = await findStageByName(admin, tenantId, "Atendimento SDR");
    if (!stage) return;

    await admin.from("deals").insert({
      tenant_id: tenantId,
      title: `Lead via WhatsApp — ${contactName}`,
      contact_id: contactId,
      stage_id: stage.id,
      value: 0,
      owner_id: sellerId,
    });
  } catch {
    // Best-effort — nunca deve travar a conversa da SDR por causa do pipeline.
  }
}

/**
 * Move (ou cria, se por algum motivo ainda não existir) o negócio do lead
 * pra Qualificado/Não Qualificado, de acordo com a avaliação da própria
 * SDR ao concluir o cadastro. "Não Qualificado" é uma etapa is_lost — mover
 * pra lá já fecha o negócio como perdido, mesmo comportamento que
 * updateDealStage já dá pra qualquer etapa is_lost.
 */
export async function moveLeadToQualificationStage(
  admin: Admin,
  tenantId: string,
  contactId: string,
  sellerId: string,
  contactName: string,
  qualified: boolean,
  note: string | null,
): Promise<void> {
  try {
    const stage = await findStageByName(admin, tenantId, qualified ? "Qualificado" : "Não Qualificado");
    if (!stage) return;

    const patch = {
      stage_id: stage.id,
      status: (stage.is_lost ? "lost" : "open") as "lost" | "open",
      closed_at: stage.is_lost ? new Date().toISOString() : null,
    };

    const existing = await findOpenDealForContact(admin, contactId);
    let dealId = existing?.id ?? null;

    if (existing) {
      await admin.from("deals").update(patch).eq("id", existing.id);
    } else {
      const { data: created } = await admin
        .from("deals")
        .insert({
          tenant_id: tenantId,
          title: `Lead via WhatsApp — ${contactName}`,
          contact_id: contactId,
          value: 0,
          owner_id: sellerId,
          ...patch,
        })
        .select("id")
        .single();
      dealId = created?.id ?? null;
    }

    await admin.from("activities").insert({
      tenant_id: tenantId,
      contact_id: contactId,
      deal_id: dealId,
      type: "note",
      body: `SDR marcou como ${qualified ? "Qualificado" : "Não Qualificado"}${note ? `: ${note}` : "."}`,
      created_by: null,
    });
  } catch {
    // Best-effort — nunca deve travar a conclusão do cadastro por causa do pipeline.
  }
}
