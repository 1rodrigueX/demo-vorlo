import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createQueryClient } from "@/lib/db/queryClient";
import { createAuthShim } from "@/lib/auth/shim";

/**
 * Cliente de service role. Durante a migração pro Prisma, é um HÍBRIDO:
 *
 *  - `.from()`, `.rpc()` → shim Prisma/pg (ver queryClient).
 *  - `.auth` → shim de auth sobre Auth.js + tabelas app_* (ver auth/shim). O
 *    `admin.*` (criar/atualizar/apagar/listar usuário) roda direto no pg.
 *  - `.storage` → ainda delega a um cliente Supabase real criado sob demanda; é
 *    a última parte não migrada (message-attachments ainda no bucket Supabase).
 *
 * Quando o storage de anexos migrar, some a metade Supabase daqui.
 */
function createSupabaseAdmin() {
  return createSupabaseClient(
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
    auth: createAuthShim(),
    get storage() {
      return getSupabase().storage;
    },
  };
}

/**
 * Tipo do cliente de service role, pra tipar funções que o recebem como
 * parâmetro. Antes essas assinaturas usavam SupabaseClient<Database>; agora
 * apontam pra cá e acompanham o shim.
 */
export type AdminClient = ReturnType<typeof createAdminClient>;
