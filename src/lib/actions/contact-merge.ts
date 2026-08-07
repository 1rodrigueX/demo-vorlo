"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";

export type DuplicateContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  dealCount: number;
  messageCount: number;
};

export type DuplicateGroup = {
  matchType: "email" | "name";
  matchValue: string;
  contacts: DuplicateContact[];
};

type CandidateRow = { match_type: string; match_value: string; contact_ids: string[]; total: number };

/**
 * Candidatos a duplicado para a tela de revisão. Telefone não entra aqui: desde
 * 0070_contact_dedupe ele tem índice único por tenant, então duplicata por
 * telefone não existe mais — sobra o que exige olho humano (mesmo e-mail, que
 * pode ser um contato@empresa.com legítimo, e nomes idênticos).
 *
 * A função no banco roda com o RLS de quem chamou, então cada vendedor só vê
 * os próprios contatos e o admin vê todos.
 */
export async function listDuplicateGroups(): Promise<DuplicateGroup[]> {
  const supabase = await createClient();

  const { data: candidates, error } = await supabase.rpc("contact_duplicate_candidates");
  if (error || !candidates?.length) {
    if (error) console.error("listDuplicateGroups failed:", error);
    return [];
  }

  const rows = candidates as CandidateRow[];
  const allIds = [...new Set(rows.flatMap((r) => r.contact_ids))];

  const [{ data: contacts }, { data: deals }, { data: messages }] = await Promise.all([
    supabase.from("contacts").select("id, name, email, phone, created_at").in("id", allIds),
    supabase.from("deals").select("contact_id").in("contact_id", allIds),
    supabase.from("whatsapp_messages").select("contact_id").in("contact_id", allIds),
  ]);

  // Contagens são o que o usuário olha pra decidir quem fica: o contato com
  // mais histórico costuma ser o "de verdade".
  const dealsByContact = countBy(deals ?? []);
  const messagesByContact = countBy(messages ?? []);

  const byId = new Map(
    (contacts ?? []).map((c) => [
      c.id,
      {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.created_at,
        dealCount: dealsByContact.get(c.id) ?? 0,
        messageCount: messagesByContact.get(c.id) ?? 0,
      } satisfies DuplicateContact,
    ]),
  );

  return rows
    .map((row) => ({
      matchType: row.match_type === "email" ? ("email" as const) : ("name" as const),
      matchValue: row.match_value,
      // Um id pode ter sumido entre a RPC e a busca (contato apagado no meio).
      contacts: row.contact_ids.map((id) => byId.get(id)).filter((c): c is DuplicateContact => Boolean(c)),
    }))
    .filter((group) => group.contacts.length > 1);
}

function countBy(rows: { contact_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.contact_id, (counts.get(row.contact_id) ?? 0) + 1);
  return counts;
}

/**
 * Mescla os duplicados no contato escolhido. Quem move negócios, mensagens,
 * tags e anexos é a função merge_contacts no banco (uma transação só, com
 * snapshot do perdedor em contact_merges) — aqui só valida a permissão de
 * tenant e trata o erro pro usuário.
 */
export async function mergeContacts(
  winnerId: string,
  loserIds: string[],
): Promise<{ error?: string; merged?: number }> {
  if (!loserIds.length) return { error: "Selecione ao menos um contato duplicado" };
  if (loserIds.includes(winnerId)) return { error: "O contato principal não pode estar na lista de duplicados" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  for (const loserId of loserIds) {
    const { error } = await supabase.rpc("merge_contacts", {
      winner_id: winnerId,
      loser_id: loserId,
      reason: "manual",
    });

    if (error) {
      console.error("mergeContacts failed:", error);
      // A mensagem das exceptions de merge_contacts já é escrita pro usuário
      // final (ver 0070_contact_dedupe); o resto vira texto genérico.
      return { error: error.message || "Não foi possível mesclar os contatos" };
    }
  }

  revalidatePath("/[tenantSlug]/contacts", "page");
  revalidatePath("/[tenantSlug]/contacts/duplicados", "page");
  revalidatePath(`/[tenantSlug]/contacts/${winnerId}`, "page");
  revalidatePath("/[tenantSlug]/pipeline", "page");
  return { merged: loserIds.length };
}

/**
 * Mescla de uma vez todos os grupos de mesmo e-mail, mantendo o contato mais
 * antigo de cada um.
 *
 * Só e-mail, de propósito: nome igual não prova mesma pessoa. Dois "João
 * Silva" diferentes virariam um cliente só, levando junto o histórico de
 * conversa de ambos — e isso não tem desfazer bonito. Grupo por nome continua
 * exigindo confirmação humana grupo a grupo.
 */
export async function mergeAllByEmail(): Promise<{ error?: string; merged?: number; groups?: number }> {
  const groups = (await listDuplicateGroups()).filter((group) => group.matchType === "email");
  if (!groups.length) return { merged: 0, groups: 0 };

  let merged = 0;
  let failed = 0;

  for (const group of groups) {
    const [winner, ...losers] = group.contacts;
    if (!winner || !losers.length) continue;

    const result = await mergeContacts(
      winner.id,
      losers.map((contact) => contact.id),
    );

    // Um grupo problemático (contatos de donos diferentes, por exemplo) não
    // pode abortar os outros — segue e reporta no fim.
    if (result.error) {
      failed++;
      continue;
    }
    merged += result.merged ?? 0;
  }

  if (!merged && failed) {
    return { error: "Nenhum grupo pôde ser mesclado — provavelmente falta permissão sobre esses contatos." };
  }

  return { merged, groups: groups.length - failed };
}
