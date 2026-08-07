import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createQueryClient } from "@/lib/db/queryClient";

/**
 * Cliente de service role. Durante a migração pro Prisma, é um HÍBRIDO:
 *
 *  - `.from()` e `.rpc()` → shim Prisma/pg (ver queryClient). Toda consulta de
 *    dado já roda no banco próprio, sem passar pelo Supabase.
 *  - `.storage` e `.auth` → delegam a um cliente Supabase real, criado sob
 *    demanda. São as duas partes que ainda não migraram (storage tem sua
 *    própria camada com chave de virada; auth vira Auth.js). Ficam aqui pra
 *    não quebrar os poucos call sites que criam/apagam usuário ou leem arquivo
 *    pelo driver antigo.
 *
 * Quando storage e auth terminarem de migrar, este arquivo perde a metade
 * Supabase e vira só o shim.
 */
function createSupabaseAdmin() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function createAdminClient() {
  const query = createQueryClient();
  let supabase: ReturnType<typeof createSupabaseAdmin> | null = null;
  const getSupabase = () => (supabase ??= createSupabaseAdmin());

  return {
    from: query.from.bind(query),
    rpc: query.rpc.bind(query),
    get storage() {
      return getSupabase().storage;
    },
    get auth() {
      return getSupabase().auth;
    },
  };
}

/**
 * Tipo do cliente de service role, pra tipar funções que o recebem como
 * parâmetro. Antes essas assinaturas usavam SupabaseClient<Database>; agora
 * apontam pra cá e acompanham o shim.
 */
export type AdminClient = ReturnType<typeof createAdminClient>;
