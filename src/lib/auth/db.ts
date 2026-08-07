import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { rawQuery } from "@/lib/db/queryClient";

/**
 * Acesso às tabelas de identidade próprias (app_users/oauth/mfa/tokens) que
 * substituem o Supabase Auth. Fala pg direto (mesmo pool do shim de dados) — a
 * autenticação não passa pelo query builder de negócio.
 */

export type AppUser = {
  id: string;
  email: string;
  email_verified_at: Date | null;
  password_hash: string | null;
  full_name: string | null;
  image: string | null;
  created_at: Date;
};

const USER_COLS = "id, email, email_verified_at, password_hash, full_name, image, created_at";

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const rows = await rawQuery<AppUser>(
    `select ${USER_COLS} from public.app_users where lower(email) = lower($1) limit 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const rows = await rawQuery<AppUser>(`select ${USER_COLS} from public.app_users where id = $1 limit 1`, [id]);
  return rows[0] ?? null;
}

export async function getUserByOAuth(provider: string, providerAccountId: string): Promise<AppUser | null> {
  const rows = await rawQuery<AppUser>(
    `select ${USER_COLS.split(", ").map((c) => `u.${c}`).join(", ")}
       from public.app_oauth_accounts a
       join public.app_users u on u.id = a.user_id
      where a.provider = $1 and a.provider_account_id = $2
      limit 1`,
    [provider, providerAccountId],
  );
  return rows[0] ?? null;
}

/** Confere a senha contra o hash bcrypt (aceita $2a do Supabase e $2b do bcryptjs). */
export async function verifyPassword(user: AppUser, password: string): Promise<boolean> {
  if (!user.password_hash) return false;
  try {
    return await bcrypt.compare(password, user.password_hash);
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function createUser(input: {
  email: string;
  password?: string | null;
  fullName?: string | null;
  emailVerified?: boolean;
  image?: string | null;
  id?: string;
}): Promise<AppUser> {
  const id = input.id ?? randomUUID();
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const rows = await rawQuery<AppUser>(
    `insert into public.app_users (id, email, password_hash, full_name, image, email_verified_at)
     values ($1, $2, $3, $4, $5, $6)
     returning ${USER_COLS}`,
    [id, input.email, passwordHash, input.fullName ?? null, input.image ?? null, input.emailVerified ? new Date() : null],
  );
  return rows[0];
}

export async function updateUser(
  id: string,
  patch: { password?: string; fullName?: string; email?: string; emailVerified?: boolean; image?: string | null },
): Promise<void> {
  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [];
  const add = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.password !== undefined) add("password_hash", await hashPassword(patch.password));
  if (patch.fullName !== undefined) add("full_name", patch.fullName);
  if (patch.email !== undefined) add("email", patch.email);
  if (patch.image !== undefined) add("image", patch.image);
  if (patch.emailVerified !== undefined) add("email_verified_at", patch.emailVerified ? new Date() : null);

  params.push(id);
  await rawQuery(`update public.app_users set ${sets.join(", ")} where id = $${params.length}`, params);
}

export async function deleteUser(id: string): Promise<void> {
  await rawQuery(`delete from public.app_users where id = $1`, [id]);
}

export async function listAllUserEmails(): Promise<{ id: string; email: string }[]> {
  return rawQuery<{ id: string; email: string }>(`select id, email from public.app_users order by created_at`);
}

export type ListedUser = { id: string; email: string; full_name: string | null; created_at: Date };

/** Página de usuários (para o admin.listUsers do shim). */
export async function listUsersPaged(limit: number, offset: number): Promise<ListedUser[]> {
  return rawQuery<ListedUser>(
    `select id, email, full_name, created_at from public.app_users order by created_at limit $1 offset $2`,
    [limit, offset],
  );
}

// ── OAuth ────────────────────────────────────────────────────────────────────

export async function linkOAuthAccount(userId: string, provider: string, providerAccountId: string): Promise<void> {
  await rawQuery(
    `insert into public.app_oauth_accounts (user_id, provider, provider_account_id)
     values ($1, $2, $3)
     on conflict (provider, provider_account_id) do nothing`,
    [userId, provider, providerAccountId],
  );
}

// ── MFA (TOTP) ───────────────────────────────────────────────────────────────

export type MfaFactor = {
  id: string;
  user_id: string;
  type: string;
  secret: string;
  friendly_name: string | null;
  verified_at: Date | null;
  created_at: Date;
};

export async function getVerifiedTotpFactor(userId: string): Promise<MfaFactor | null> {
  const rows = await rawQuery<MfaFactor>(
    `select * from public.app_mfa_factors where user_id = $1 and type = 'totp' and verified_at is not null order by created_at limit 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function listFactors(userId: string): Promise<MfaFactor[]> {
  return rawQuery<MfaFactor>(`select * from public.app_mfa_factors where user_id = $1 order by created_at`, [userId]);
}

export async function getFactorById(id: string, userId: string): Promise<MfaFactor | null> {
  const rows = await rawQuery<MfaFactor>(
    `select * from public.app_mfa_factors where id = $1 and user_id = $2 limit 1`,
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function createTotpFactor(userId: string, secret: string, friendlyName: string | null): Promise<string> {
  const rows = await rawQuery<{ id: string }>(
    `insert into public.app_mfa_factors (user_id, type, secret, friendly_name) values ($1, 'totp', $2, $3) returning id`,
    [userId, secret, friendlyName],
  );
  return rows[0].id;
}

export async function markFactorVerified(factorId: string): Promise<void> {
  await rawQuery(`update public.app_mfa_factors set verified_at = now() where id = $1`, [factorId]);
}

export async function deleteFactor(factorId: string, userId: string): Promise<void> {
  await rawQuery(`delete from public.app_mfa_factors where id = $1 and user_id = $2`, [factorId, userId]);
}

// ── Tokens de e-mail (confirmação / reset) ──────────────────────────────────

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Cria um token de uso único; devolve o valor CRU (vai no link do e-mail). */
export async function createAuthToken(
  purpose: "email_verify" | "password_reset",
  target: { userId?: string; email: string },
  ttlMinutes = 60,
): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await rawQuery(
    `insert into public.app_auth_tokens (user_id, email, purpose, token_hash, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [target.userId ?? null, target.email, purpose, hashToken(raw), expiresAt],
  );
  return raw;
}

/** Valida e CONSOME o token (uso único). Devolve o alvo ou null se inválido/expirado. */
export async function consumeAuthToken(
  raw: string,
  purpose: "email_verify" | "password_reset",
): Promise<{ userId: string | null; email: string } | null> {
  const rows = await rawQuery<{ id: string; user_id: string | null; email: string }>(
    `update public.app_auth_tokens
        set used_at = now()
      where token_hash = $1 and purpose = $2 and used_at is null and expires_at > now()
      returning id, user_id, email`,
    [hashToken(raw), purpose],
  );
  const row = rows[0];
  return row ? { userId: row.user_id, email: row.email } : null;
}
