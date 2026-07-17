import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export function getSpotifyAuthorizeUrl(state: string, redirectUri: string): string | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return null;

  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

type SpotifyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

async function requestToken(body: Record<string, string>): Promise<SpotifyTokenResponse> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify não configurado no servidor (SPOTIFY_CLIENT_ID/SECRET)");

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token request failed: ${text}`);
  }
  return res.json();
}

export async function exchangeSpotifyCode(code: string, redirectUri: string, profileId: string): Promise<void> {
  const token = await requestToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });

  const meRes = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = meRes.ok ? ((await meRes.json()) as { id?: string; product?: string }) : null;

  if (!token.refresh_token) throw new Error("Spotify não retornou refresh_token");

  const admin = createAdminClient();
  const { error } = await admin.from("user_spotify_connections").upsert({
    profile_id: profileId,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    spotify_user_id: me?.id ?? null,
    product: me?.product ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Retorna um access_token válido pro usuário, renovando via refresh_token se já tiver expirado. */
export async function getValidSpotifyAccessToken(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_spotify_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data) return null;

  const expiresInMs = new Date(data.expires_at).getTime() - Date.now();
  if (expiresInMs > 60_000) return data.access_token;

  // Se a renovação falhar (refresh_token revogado, Spotify fora do ar, etc.),
  // não deixa a Server Action inteira estourar pro usuário — trata como
  // "não conectado", que os chamadores já sabem mostrar como mensagem amigável.
  try {
    const token = await requestToken({ grant_type: "refresh_token", refresh_token: data.refresh_token });
    await admin
      .from("user_spotify_connections")
      .update({
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? data.refresh_token,
        expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      })
      .eq("profile_id", profileId);

    return token.access_token;
  } catch (err) {
    console.error("getValidSpotifyAccessToken: falha ao renovar o token", err);
    return null;
  }
}
