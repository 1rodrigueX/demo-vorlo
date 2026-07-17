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

  revalidatePath("/settings/integracoes");
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

  revalidatePath("/settings/integracoes");
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

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoCategoryId", "10"); // categoria "Música"
  // Busca mais que o necessário porque parte vai ser descartada no filtro de
  // embeddable abaixo — sem isso a lista final fica curta demais.
  searchUrl.searchParams.set("maxResults", "25");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString());
  const searchData = await searchRes.json();

  if (!searchRes.ok) {
    return { error: searchData?.error?.message ?? "Falha ao buscar no YouTube" };
  }

  type YoutubeSearchItem = {
    id: { videoId: string };
    snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
  };

  const items = (searchData.items ?? []) as YoutubeSearchItem[];
  if (!items.length) return { results: [] };

  // A busca não informa se o dono do vídeo permite incorporação — um
  // segundo request em videos.list traz esse status (campo embeddable),
  // pra já descartar os que dariam erro "não permite tocar fora do YouTube".
  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "status");
  videosUrl.searchParams.set("id", items.map((item) => item.id.videoId).join(","));
  videosUrl.searchParams.set("key", apiKey);

  const videosRes = await fetch(videosUrl.toString());
  const videosData = await videosRes.json();

  const embeddableIds = new Set<string>(
    videosRes.ok
      ? ((videosData.items ?? []) as { id: string; status?: { embeddable?: boolean } }[])
          .filter((v) => v.status?.embeddable !== false)
          .map((v) => v.id)
      : items.map((item) => item.id.videoId), // se essa checagem falhar, não bloqueia a busca inteira
  );

  const results: YoutubeSearchResult[] = items
    .filter((item) => embeddableIds.has(item.id.videoId))
    .slice(0, 12)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
    }));

  return { results };
}
