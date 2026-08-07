import type { NextAuthConfig } from "next-auth";

/**
 * Base do Auth.js compartilhada entre o runtime completo (auth.ts, com os
 * providers que falam com o banco) e o middleware (proxy.ts, que roda no edge e
 * só LÊ a sessão do JWT). Aqui não pode entrar nada de Node (pg, bcrypt) — por
 * isso os providers ficam vazios; o auth.ts os adiciona.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
