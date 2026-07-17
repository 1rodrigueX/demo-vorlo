"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";

export type ActionState = { error?: string } | null;

export async function saveYoutubeApiKey(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { error: "Informe a chave da API" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const test = await searchYoutube("teste", tenantId, apiKey);
  if ("error" in test) return { error: `Chave inválida: ${test.error}` };

  const { error } = await supabase.from("tenants").update({ youtube_api_key: apiKey }).eq("id", tenantId);
  if (error) return { error: "Só o dono ou gestor pode alterar essas configurações" };

  revalidatePath("/settings");
  return null;
}

export async function removeYoutubeApiKey(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("tenants").update({ youtube_api_key: null }).eq("id", tenantId);
  if (error) return { error: "Só o dono ou gestor pode alterar essas configurações" };

  revalidatePath("/settings");
  return null;
}

export type YoutubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

/** Usada tanto pelo teste de chave quanto pela busca real da tela /musica. */
export async function searchYoutube(
  query: string,
  tenantIdOverride?: string,
  apiKeyOverride?: string,
): Promise<{ results: YoutubeSearchResult[] } | { error: string }> {
  let apiKey = apiKeyOverride;

  if (!apiKey) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada, faça login novamente" };

    const tenantId = tenantIdOverride ?? (await requireTenantId(supabase, user.id));
    if (!tenantId) return { error: "Tenant não encontrado" };

    const { data: tenant } = await supabase.from("tenants").select("youtube_api_key").eq("id", tenantId).maybeSingle();
    apiKey = tenant?.youtube_api_key ?? undefined;
  }

  if (!apiKey) return { error: "Nenhuma chave da API do YouTube configurada (Configurações → Música)" };
  if (!query.trim()) return { results: [] };

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10"); // categoria "Música"
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    return { error: data?.error?.message ?? "Falha ao buscar no YouTube" };
  }

  type YoutubeSearchItem = {
    id: { videoId: string };
    snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
  };

  const results: YoutubeSearchResult[] = ((data.items ?? []) as YoutubeSearchItem[]).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
  }));

  return { results };
}
