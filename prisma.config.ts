import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// O projeto guarda as variáveis em .env.local (convenção do Next), e o dotenv
// lê .env por padrão — sem apontar o caminho, o CLI do Prisma não acha a
// DATABASE_URL e falha antes de qualquer comando.
config({ path: ".env.local" });

/**
 * Configuração do CLI do Prisma (db pull, migrate, studio).
 *
 * A partir do Prisma 7 a URL do banco sai do schema.prisma e vem pra cá; o
 * runtime, por sua vez, recebe a conexão por um driver adapter (ver
 * src/lib/db/prisma.ts). São dois caminhos diferentes pro mesmo DATABASE_URL.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations e db pull vão pela DIRECT_URL (pooler em modo sessão, porta
    // 5432). O DATABASE_URL do projeto é o pooler de transação (6543,
    // pgbouncer), que não aceita os comandos de migration.
    //
    // Fallback pro DATABASE_URL (e "" no pior caso) DE PROPÓSITO: `prisma
    // generate` — o único comando do Prisma no deploy — só lê o schema, não
    // conecta. Sem o fallback, o env() lançava e derrubava o build no VPS
    // quando lá só havia DATABASE_URL. Migrations você roda à mão, aí sim com
    // a DIRECT_URL setada.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
