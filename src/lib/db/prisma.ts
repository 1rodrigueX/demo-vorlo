import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma Client compartilhado.
 *
 * No Prisma 7 a conexão não vem mais do schema: o client recebe um driver
 * adapter (aqui, node-postgres). A URL continua sendo DATABASE_URL — o CLI lê
 * dela em prisma.config.ts, o runtime lê aqui.
 *
 * Guardado no globalThis porque o hot reload do Next recria o módulo a cada
 * alteração; sem isso, cada reload abriria um pool novo e o Postgres derrubaria
 * a aplicação por excesso de conexões em poucos minutos de desenvolvimento.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada — veja .env.local.example");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Executa um bloco com o usuário e o tenant da requisição fixados na sessão do
 * Postgres, dentro de uma transação.
 *
 * É o caminho para manter as policies de RLS valendo depois que o Supabase
 * sair: elas passam a ler `current_setting('app.user_id')` no lugar de
 * `auth.uid()`, que era função da Supabase e deixa de existir.
 *
 * `SET LOCAL` (via set_config com `true`) vale só até o fim da transação, então
 * uma conexão devolvida ao pool nunca carrega o contexto do usuário anterior —
 * que seria justamente o jeito de um cliente enxergar os dados de outro.
 */
export async function withRlsContext<T>(
  userId: string,
  tenantId: string,
  run: (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.user_id', ${userId}, true)`;
    await tx.$executeRaw`select set_config('app.tenant_id', ${tenantId}, true)`;
    return run(tx);
  });
}
