"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidSpotifyAccessToken, SPOTIFY_API_BASE } from "@/lib/spotify/client";

export type ActionState = { error?: string } | null;

export async function getSpotifyStatus(): Promise<{ connected: boolean; product: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false, product: null };

  const { data } = await supabase
    .from("user_spotify_connections")
    .select("product")
    .eq("profile_id", user.id)
    .maybeSingle();

  return { connected: !!data, product: data?.product ?? null };
}

export async function disconnectSpotify(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const { error } = await supabase.from("user_spotify_connections").delete().eq("profile_id", user.id);
  if (error) return { error: "Não foi possível desconectar" };
  return null;
}

/** Token de acesso pro Web Playback SDK no navegador — o SDK precisa dele diretamente no cliente. */
export async function getSpotifyPlaybackToken(): Promise<{ token: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { error: "Spotify não conectado" };
  return { token };
}

export type SpotifyTrack = {
  uri: string;
  name: string;
  artists: string;
  albumArt: string;
};

export async function searchSpotify(query: string): Promise<{ results: SpotifyTrack[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { error: "Conecte sua conta do Spotify primeiro" };
  if (!query.trim()) return { results: [] };

  // Apps do Spotify em "Development Mode" (sem quota estendida aprovada)
  // recusam limit acima de 10 no /search com "Invalid limit" — 11 já falha.
  const url = new URL(`${SPOTIFY_API_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "10");

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    console.error("searchSpotify: falha na busca", res.status, JSON.stringify(data));
    return { error: data?.error?.message ?? `Falha ao buscar no Spotify (${res.status})` };
  }

  type SpotifyTrackItem = {
    uri: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
  };

  const results: SpotifyTrack[] = ((data.tracks?.items ?? []) as SpotifyTrackItem[]).map((item) => {
    const images = item.album?.images ?? [];
    return {
      uri: item.uri,
      name: item.name,
      artists: (item.artists ?? []).map((a) => a.name).join(", "),
      albumArt: images[images.length - 1]?.url ?? images[0]?.url ?? "",
    };
  });

  return { results };
}

/** Manda o Spotify tocar a faixa no "device" (aba do navegador) criado pelo Web Playback SDK. */
export async function playSpotifyTrack(deviceId: string, uri: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const token = await getValidSpotifyAccessToken(user.id);
  if (!token) return { error: "Conecte sua conta do Spotify primeiro" };

  const res = await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [uri] }),
  });

  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => null);
    return {
      error:
        res.status === 403
          ? "Sua conta do Spotify não é Premium — reprodução completa exige Premium."
          : (data?.error?.message ?? "Não foi possível tocar a faixa"),
    };
  }
  return null;
}
