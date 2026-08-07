import { createQueryClient } from "@/lib/db/queryClient";
import { createAuthShim } from "@/lib/auth/shim";

/**
 * Cliente com contexto de usuário. Pós-migração:
 *
 *  - `.from()` e `.rpc()` → shim Prisma/pg (queryClient).
 *  - `.auth` → shim de auth sobre Auth.js (ver auth/shim). `getUser()` lê a
 *    sessão JWT do Auth.js; não fala mais com o Supabase.
 *
 * ⚠️ ISOLAMENTO ENTRE EMPRESAS: o shim conecta como service role e IGNORA RLS.
 * O isolamento depende dos filtros de tenant/created_by no código, não mais das
 * policies. Aceitável enquanto for base pequena; restaurar via withRlsContext
 * (ver lib/db/prisma) antes de multi-tenant real. É o item de segurança nº1.
 */

/** Tipo do cliente de sessão (shim de dados + shim de auth), pra helpers que precisam de `.auth`. */
export type SessionClient = Awaited<ReturnType<typeof createClient>>;

export async function createClient() {
  const query = createQueryClient();
  return {
    from: query.from.bind(query),
    rpc: query.rpc.bind(query),
    auth: createAuthShim(),
  };
}
