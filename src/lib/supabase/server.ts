import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { createQueryClient } from "@/lib/db/queryClient";

/**
 * Cliente com contexto de usuário. Durante a migração pro Prisma é HÍBRIDO,
 * igual ao createAdminClient:
 *
 *  - `.from()` e `.rpc()` → shim Prisma/pg (queryClient). As consultas de dado
 *    já rodam no banco próprio.
 *  - `.auth` → cliente Supabase SSR real, que continua lendo/escrevendo o
 *    cookie de sessão. É a autenticação, que ainda não migrou (vira Auth.js).
 *
 * ⚠️ MUDANÇA DE COMPORTAMENTO — ISOLAMENTO ENTRE EMPRESAS:
 * O cliente de sessão do Supabase rodava as consultas sob RLS, com o JWT do
 * usuário. O shim conecta como service role e IGNORA RLS. Então o isolamento
 * passa a depender só dos filtros de tenant/created_by que já existem no
 * código — e NÃO mais das policies do banco.
 *
 * Aceitável agora: base de teste, um tenant só, e o dono pediu pra tratar
 * segurança depois. Antes de multi-tenant real, restaurar o isolamento (via
 * withRlsContext, ver lib/db/prisma, ou conferindo o filtro de tenant em toda
 * consulta com sessão). É o item de segurança nº1.
 */
async function createSupabaseSession() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component sem contexto de request pra escrever.
            // Seguro ignorar: o middleware renova a sessão a cada request.
          }
        },
      },
    },
  );
}

/** Tipo do cliente de sessão (shim + auth), pra helpers que precisam de `.auth`. */
export type SessionClient = Awaited<ReturnType<typeof createClient>>;

export async function createClient() {
  const query = createQueryClient();
  // O cliente Supabase é criado aqui só pela AUTENTICAÇÃO (cookies de sessão).
  // Expor o `.auth` real preserva todos os tipos e overloads (enroll.totp,
  // challengeAndVerify etc.) sem embrulhar método por método. As consultas de
  // dado (.from/.rpc) não passam por ele — vão pelo shim.
  const supabase = await createSupabaseSession();

  return {
    from: query.from.bind(query),
    rpc: query.rpc.bind(query),
    auth: supabase.auth,
  };
}
