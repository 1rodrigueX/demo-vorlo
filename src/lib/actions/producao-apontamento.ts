"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apontamentoSchema } from "@/lib/validation/producao-funcionario";
import type { ProducaoApontamento } from "@/types/domain";

export type ActionState = { error?: string } | null;

export async function getRecentApontamentos(): Promise<ProducaoApontamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("producao_apontamentos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

/**
 * Toda a lógica (validar estoque de matéria-prima, consumir, somar produto
 * acabado, gravar o apontamento) roda atomicamente dentro de
 * registrar_apontamento() no banco — ver migration 0057. Aqui só valida o
 * formulário e repassa.
 */
export async function registrarApontamentoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = apontamentoSchema.safeParse({
    produtoId: formData.get("produtoId"),
    turnoId: formData.get("turnoId"),
    maquinaId: formData.get("maquinaId"),
    estiloId: formData.get("estiloId"),
    quantity: formData.get("quantity"),
    perdas: formData.get("perdas"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_apontamento", {
    p_produto_id: parsed.data.produtoId,
    p_turno_id: parsed.data.turnoId || null,
    p_maquina_id: parsed.data.maquinaId || null,
    p_estilo_id: parsed.data.estiloId || null,
    p_quantity: parsed.data.quantity,
    p_note: parsed.data.note || null,
    p_perdas: parsed.data.perdas,
  });
  if (error) return { error: error.message };

  revalidatePath("/[tenantSlug]/producao/apontamento", "page");
  return null;
}
