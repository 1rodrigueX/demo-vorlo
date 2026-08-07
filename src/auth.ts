import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authenticator } from "otplib";
import authConfig from "@/auth.config";
import {
  getUserByEmail,
  verifyPassword,
  getVerifiedTotpFactor,
  getUserByOAuth,
  getUserById,
  linkOAuthAccount,
  createUser,
} from "@/lib/auth/db";

/**
 * Auth.js (v5) — autenticação própria, no lugar do Supabase Auth (GoTrue).
 *
 * Sessão JWT (stateless, igual ao modelo antigo). O `sub` do token é o UUID do
 * usuário em public.app_users — o MESMO id de antes (semeado de auth.users),
 * então profiles, created_by e tenant continuam batendo.
 *
 * MFA em PASSO ÚNICO: se o usuário tem TOTP, o código entra no próprio login
 * (campo que aparece quando o back pede). Mais simples e seguro que o AAL de
 * dois passos do Supabase — ou loga completo, ou não loga.
 */

// Códigos distintos pra o formulário de login saber o que aconteceu.
class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required";
}
class MfaInvalidError extends CredentialsSignin {
  code = "mfa_invalid";
}
class EmailNotConfirmedError extends CredentialsSignin {
  code = "email_not_confirmed";
}

authenticator.options = { window: 1 }; // tolera ±1 janela de relógio (30s)

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, totp: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        if (!user) return null;
        if (!user.email_verified_at) throw new EmailNotConfirmedError();

        const ok = await verifyPassword(user, password);
        if (!ok) return null;

        // MFA: tem fator TOTP verificado → exige o código no mesmo login.
        const factor = await getVerifiedTotpFactor(user.id);
        if (factor) {
          const code = String(creds?.totp ?? "").replace(/\D/g, "");
          if (!code) throw new MfaRequiredError();
          if (!authenticator.check(code, factor.secret)) throw new MfaInvalidError();
        }

        return { id: user.id, email: user.email, name: user.full_name, image: user.image };
      },
    }),
    // Google entra só quando as credenciais existem — assim dá pra subir
    // "e-mail/senha por enquanto" sem quebrar, e o login Google se ativa
    // sozinho ao setar AUTH_GOOGLE_ID/SECRET no servidor e reiniciar.
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
  ],
  callbacks: {
    // Google: vincula/cria o app_user pelo sub e garante o UUID interno no token.
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google") return true;

      const sub = account.providerAccountId;
      let appUser = await getUserByOAuth("google", sub);

      if (!appUser) {
        const email = (profile?.email ?? user.email ?? "").toLowerCase();
        if (!email) return false;
        let byEmail = await getUserByEmail(email);
        if (!byEmail) {
          byEmail = await createUser({
            email,
            emailVerified: true,
            fullName: (profile?.name as string | undefined) ?? null,
            image: (profile?.picture as string | undefined) ?? null,
          });
        }
        await linkOAuthAccount(byEmail.id, "google", sub);
        appUser = byEmail;
      }

      user.id = appUser.id; // troca o id do provider pelo nosso UUID
      user.name = appUser.full_name ?? user.name;
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session: async ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Recarrega o usuário atual do banco (nome/email/imagem atualizados) a partir do id da sessão. */
export async function currentAppUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return getUserById(id);
}
