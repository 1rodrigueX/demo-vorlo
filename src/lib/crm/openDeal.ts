import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Negócio aberto do contato (o mais recente, se houver mais de um).
 *
 * Existe para responder sempre a mesma pergunta antes de criar um negócio:
 * "esse lead já não está no funil?". Sem essa checagem, o mesmo cliente vira
 * vários cards no Kanban — o SDR já se protegia disso, o webhook público não,
 * e cada reenvio do formulário criava mais um card.
 */
export async function findOpenDealForContact(
  admin: Admin,
  contactId: string,
): Promise<{ id: string; stage_id: string } | null> {
  const { data } = await admin
    .from("deals")
    .select("id, stage_id")
    .eq("contact_id", contactId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/** Posição no fim da coluna — usada por quem cria ou move um negócio. */
export async function nextPositionInStage(admin: Admin, stageId: string): Promise<number> {
  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", stageId);

  return count ?? 0;
}
