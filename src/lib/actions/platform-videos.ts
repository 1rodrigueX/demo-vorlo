"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";

export type ActionState = { error?: string } | null;

export async function createTutorialVideo(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) return { error: "Informe um título" };
  if (!videoUrl) return { error: "Informe a URL do vídeo" };

  const admin = createAdminClient();
  const { error } = await admin.from("platform_tutorial_videos").insert({
    title,
    video_url: videoUrl,
    description: description || null,
  });

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/dev/videos");
  revalidatePath("/[tenantSlug]/suporte", "page");
  return null;
}

export async function deleteTutorialVideo(videoId: string): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("platform_tutorial_videos").delete().eq("id", videoId);
  if (error) return { error: "Não foi possível remover" };

  revalidatePath("/dev/videos");
  revalidatePath("/[tenantSlug]/suporte", "page");
  return null;
}

/** Lista pública (autenticado, qualquer tenant) pra aba Suporte > Vídeos. */
export async function listTutorialVideos() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_tutorial_videos")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  return data ?? [];
}
