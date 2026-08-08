"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { rawQuery, withTransaction } from "@/lib/db/queryClient";

export type DevActionState = { error?: string } | null;

// Tabelas com tenant_id que NÃO caem por cascata ao deletar o tenant (delete
// rule NO ACTION) — precisam ser apagadas ANTES, nesta ordem (filhos antes de
// pais; o resto cascateia). Ordem validada por dry-run contra o banco real.
const TENANT_CHILD_ORDER = [
  "activities",
  "whatsapp_messages",
  "chat_messages",
  "deals",
  "contacts",
  "companies",
  "pipeline_stages",
  "transportadora_fretes",
  "transportadora_clientes",
  "transportadora_motoristas",
  "transportadora_configuracoes",
  "transportadora_pending_checkouts",
  "profiles",
] as const;

// Colunas que referenciam profiles com NO ACTION — ao excluir UM usuário, os
// registros dele são reatribuídos ao dono do CRM antes de apagar o profile.
const PROFILE_OWNED_COLUMNS: { table: string; column: string }[] = [
  { table: "activities", column: "created_by" },
  { table: "companies", column: "created_by" },
  { table: "contact_attachments", column: "uploaded_by" },
  { table: "contacts", column: "created_by" },
  { table: "deals", column: "owner_id" },
];

/**
 * Exclui um CRM (tenant) e TUDO dele — dados, integrações e os usuários (login +
 * profile) — numa transação. Destrutivo e sem volta. Só dev da plataforma.
 */
export async function deleteTenantAsDev(tenantId: string): Promise<DevActionState> {
  if (!(await isCurrentUserDev())) return { error: "Acesso restrito a devs da plataforma" };
  if (!tenantId) return { error: "Empresa inválida" };

  try {
    await withTransaction(async (q) => {
      // Usuários deste tenant (pra apagar login depois de apagar os profiles).
      const profiles = await q<{ id: string }>("select id from public.profiles where tenant_id = $1", [tenantId]);
      const userIds = profiles.map((p) => p.id);

      for (const table of TENANT_CHILD_ORDER) {
        await q(`delete from public.${table} where tenant_id = $1`, [tenantId]);
      }
      // Apaga o tenant — cascateia as ~45 tabelas restantes.
      await q("delete from public.tenants where id = $1", [tenantId]);

      // Remove o login desses usuários. Só app_users (o store ativo); auth.users
      // está dormente e será removido quando limparmos o Supabase de vez.
      if (userIds.length) {
        await q("delete from public.app_users where id = any($1::uuid[])", [userIds]);
      }
    });
  } catch (err) {
    console.error("deleteTenantAsDev falhou:", err);
    return { error: `Não foi possível excluir a empresa: ${err instanceof Error ? err.message : "erro desconhecido"}` };
  }

  revalidatePath("/dev");
  revalidatePath("/dev/usuarios");
  return null;
}

export type DevUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  is_dev: boolean;
  created_at: string;
};

/** Lista todos os usuários da plataforma com empresa/papel/flag dev, pra tela do painel dev. */
export async function listUsersForDev(): Promise<DevUserRow[]> {
  if (!(await isCurrentUserDev())) return [];
  return rawQuery<DevUserRow>(`
    select u.id,
           u.email,
           u.full_name,
           p.role,
           p.tenant_id,
           t.name as tenant_name,
           t.slug as tenant_slug,
           (d.id is not null) as is_dev,
           u.created_at
    from public.app_users u
    left join public.profiles p on p.id = u.id
    left join public.tenants t on t.id = p.tenant_id
    left join public.dev_users d on d.id = u.id
    order by u.created_at desc
  `);
}

/**
 * Exclui um usuário (login + profile). Se ele tiver criado dados no CRM, os
 * registros são reatribuídos ao dono da empresa antes de apagar. Dono de CRM
 * não é excluído por aqui (exclua o CRM inteiro na aba Empresas). Só dev.
 */
export async function deleteUserAsDev(userId: string): Promise<DevActionState> {
  if (!(await isCurrentUserDev())) return { error: "Acesso restrito a devs da plataforma" };

  const session = await auth();
  if (session?.user?.id === userId) return { error: "Você não pode excluir a si mesmo" };

  const profiles = await rawQuery<{ tenant_id: string; role: string }>(
    "select tenant_id, role from public.profiles where id = $1",
    [userId],
  );
  const profile = profiles[0];

  if (profile?.role === "owner") {
    return { error: "Este usuário é dono de um CRM. Exclua o CRM inteiro na aba Empresas." };
  }

  try {
    await withTransaction(async (q) => {
      if (profile) {
        // Acha um profile pra herdar os registros (o dono, ou qualquer outro do tenant).
        const heirs = await q<{ id: string }>(
          `select id from public.profiles
             where tenant_id = $1 and id <> $2
             order by case when role = 'owner' then 0 else 1 end
             limit 1`,
          [profile.tenant_id, userId],
        );
        const heir = heirs[0]?.id ?? null;

        if (heir) {
          for (const { table, column } of PROFILE_OWNED_COLUMNS) {
            await q(`update public.${table} set ${column} = $1 where ${column} = $2`, [heir, userId]);
          }
        } else {
          // Sem herdeiro: zera o que é anulável; se sobrar registro não-anulável,
          // o delete do profile falha e a transação reverte (mensagem clara).
          await q(`update public.activities set created_by = null where created_by = $1`, [userId]);
          await q(`update public.contact_attachments set uploaded_by = null where uploaded_by = $1`, [userId]);
        }

        await q("delete from public.profiles where id = $1", [userId]);
      }

      // Se for um dev, tira o acesso dev também.
      await q("delete from public.dev_active_view where dev_id = $1", [userId]);
      await q("delete from public.dev_users where id = $1", [userId]);

      // Só app_users (store ativo); auth.users fica dormente até a limpeza final do Supabase.
      await q("delete from public.app_users where id = $1", [userId]);
    });
  } catch (err) {
    console.error("deleteUserAsDev falhou:", err);
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return {
      error: /foreign key|violates/i.test(msg)
        ? "Este usuário tem dados no CRM que não puderam ser reatribuídos. Exclua o CRM inteiro na aba Empresas."
        : `Não foi possível excluir o usuário: ${msg}`,
    };
  }

  revalidatePath("/dev/usuarios");
  revalidatePath("/central/usuarios");
  return null;
}
