"use server";

import { createClient } from "@/lib/supabase/server";
import type { ErpNotificacao } from "@/types/domain";

/** Notificações do ERP — hoje só o evento "SDR montou uma proposta" usa isso de verdade;
 * o resto do sino no ErpTopbar continua mockado (fora do escopo desta fase). */
export async function getErpNotificacoes(): Promise<ErpNotificacao[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("erp_notificacoes")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function markErpNotificacaoRead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("erp_notificacoes").update({ read_at: new Date().toISOString() }).eq("id", id).eq("profile_id", user.id);
}

export async function markAllErpNotificacoesRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("erp_notificacoes")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null);
}
