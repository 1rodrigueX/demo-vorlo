import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

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
    url: env("DATABASE_URL"),
  },
});
