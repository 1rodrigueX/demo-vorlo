import "server-only";
import { auth, signOut as authSignOut } from "@/auth";
import {
  createUser as dbCreateUser,
  updateUser as dbUpdateUser,
  deleteUser as dbDeleteUser,
  getUserById as dbGetUserById,
  listUsersPaged,
} from "@/lib/auth/db";

/**
 * Shim de `.auth` no formato do supabase-js, no lugar do Supabase Auth. Deixa
 * os ~180 `supabase.auth.getUser()` e os `admin.auth.admin.*` seguirem
 * funcionando sem reescrita — mesma ideia do shim de dados (queryClient).
 *
 * Por baixo é o Auth.js (sessão/JWT) + as tabelas app_* (pg). Retorna sempre
 * `{ data, error }` como o cliente do Supabase.
 */

/** Usuário no formato que o app espera do Supabase (só o que é de fato usado). */
export type ShimUser = {
  id: string;
  email: string | null;
  user_metadata: { full_name?: string | null; name?: string | null; avatar_url?: string | null };
  app_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
  last_sign_in_at: string | null;
};

type SessionUser = { id: string; email?: string | null; name?: string | null; image?: string | null };

/** Metadata do usuário no formato do Supabase; só `full_name` é lido pelo app, o resto é aceito e ignorado. */
type UserMetadataInput = { full_name?: string | null; [key: string]: unknown };

function mapUser(u: SessionUser): ShimUser {
  return {
    id: u.id,
    email: u.email ?? null,
    user_metadata: { full_name: u.name ?? null, name: u.name ?? null, avatar_url: u.image ?? null },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
    last_sign_in_at: null,
  };
}

type Result<T> = { data: T; error: { message: string; code?: string } | null };

export function createAuthShim() {
  return {
    async getUser(): Promise<Result<{ user: ShimUser | null }>> {
      const session = await auth();
      const u = session?.user;
      return { data: { user: u?.id ? mapUser(u as SessionUser) : null }, error: null };
    },

    async getSession(): Promise<Result<{ session: { user: ShimUser; access_token: string } | null }>> {
      const session = await auth();
      const u = session?.user;
      return {
        data: { session: u?.id ? { user: mapUser(u as SessionUser), access_token: "" } : null },
        error: null,
      };
    },

    async signOut(): Promise<{ error: null }> {
      await authSignOut({ redirect: false });
      return { error: null };
    },

    // MFA agora é passo único (o código TOTP entra no próprio login). Então o
    // "nível de garantia" nunca fica pendente: reportamos aal1==aal1, o que faz
    // o `needsMfaChallenge` do middleware/rotas dar sempre false (sem redirect).
    mfa: {
      async getAuthenticatorAssuranceLevel(): Promise<
        Result<{ currentLevel: "aal1" | "aal2"; nextLevel: "aal1" | "aal2" }>
      > {
        return { data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null };
      },
    },

    admin: {
      async getUserById(id: string): Promise<Result<{ user: ShimUser | null }>> {
        const u = await dbGetUserById(id);
        return {
          data: { user: u ? mapUser({ id: u.id, email: u.email, name: u.full_name, image: u.image }) : null },
          error: null,
        };
      },

      async createUser(attrs: {
        email: string;
        password?: string;
        email_confirm?: boolean;
        user_metadata?: UserMetadataInput;
      }): Promise<Result<{ user: ShimUser | null }>> {
        try {
          const user = await dbCreateUser({
            email: attrs.email,
            password: attrs.password ?? null,
            emailVerified: attrs.email_confirm ?? false,
            fullName: attrs.user_metadata?.full_name ?? null,
          });
          return { data: { user: mapUser({ id: user.id, email: user.email, name: user.full_name }) }, error: null };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha ao criar usuário";
          const code = /duplicate|unique/i.test(message) ? "email_exists" : undefined;
          return { data: { user: null }, error: { message, code } };
        }
      },

      async updateUserById(
        id: string,
        attrs: { password?: string; email?: string; user_metadata?: UserMetadataInput },
      ): Promise<Result<{ user: null }>> {
        try {
          await dbUpdateUser(id, {
            password: attrs.password,
            email: attrs.email,
            fullName: attrs.user_metadata?.full_name ?? undefined,
          });
          return { data: { user: null }, error: null };
        } catch (err) {
          return { data: { user: null }, error: { message: err instanceof Error ? err.message : "Falha ao atualizar" } };
        }
      },

      async deleteUser(id: string): Promise<Result<{ user: null }>> {
        try {
          await dbDeleteUser(id);
          return { data: { user: null }, error: null };
        } catch (err) {
          return { data: { user: null }, error: { message: err instanceof Error ? err.message : "Falha ao remover" } };
        }
      },

      async listUsers(
        opts: { page?: number; perPage?: number } = {},
      ): Promise<Result<{ users: ShimUser[] }>> {
        const perPage = opts.perPage ?? 50;
        const page = opts.page ?? 1;
        try {
          const rows = await listUsersPaged(perPage, (page - 1) * perPage);
          const users = rows.map((r) => mapUser({ id: r.id, email: r.email, name: r.full_name }));
          return { data: { users }, error: null };
        } catch (err) {
          return { data: { users: [] }, error: { message: err instanceof Error ? err.message : "Falha ao listar" } };
        }
      },
    },
  };
}

export type AuthShim = ReturnType<typeof createAuthShim>;
