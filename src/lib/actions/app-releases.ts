"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserDev } from "@/lib/auth/current-user";

export type ReleaseActionState = { error?: string } | null;

const releaseSchema = z.object({
  // Semver puro: é o que o Tauri compara com a versão instalada. "v0.2.0"
  // aqui faria o app achar que nunca há atualização.
  version: z.string().trim().regex(/^\d+\.\d+\.\d+$/, "Use o formato 0.2.0 (sem o 'v')"),
  url: z.url("Informe a URL pública do instalador (.exe)"),
  signature: z.string().trim().min(20, "Cole o conteúdo do arquivo .sig gerado no build"),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Publica uma versão do app desktop. Publicar já despublica a anterior — só
 * uma fica ativa por plataforma, que é o que o manifesto em /api/app/update
 * devolve.
 */
export async function publishRelease(
  _prevState: ReleaseActionState,
  formData: FormData,
): Promise<ReleaseActionState> {
  if (!(await isCurrentUserDev())) return { error: "Só o time Vorlo pode publicar versões" };

  const parsed = releaseSchema.safeParse({
    version: formData.get("version"),
    url: formData.get("url"),
    signature: formData.get("signature"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const platform = "windows-x86_64";
  const now = new Date().toISOString();

  await supabase
    .from("app_releases")
    .update({ is_published: false })
    .eq("platform", platform)
    .eq("is_published", true);

  const { error } = await supabase.from("app_releases").upsert(
    {
      version: parsed.data.version,
      platform,
      url: parsed.data.url,
      signature: parsed.data.signature,
      notes: parsed.data.notes || null,
      is_published: true,
      published_at: now,
      created_by: user?.id ?? null,
    },
    { onConflict: "version" },
  );

  if (error) {
    console.error("publishRelease failed:", error);
    return { error: `Não foi possível publicar: ${error.message}` };
  }

  revalidatePath("/dev/atualizacoes", "page");
  return null;
}

/** Tira a versão do ar sem apagar o registro — o app volta a não ver atualização. */
export async function unpublishRelease(id: string): Promise<ReleaseActionState> {
  if (!(await isCurrentUserDev())) return { error: "Sem permissão" };

  const supabase = await createClient();
  const { error } = await supabase.from("app_releases").update({ is_published: false }).eq("id", id);
  if (error) return { error: "Não foi possível despublicar" };

  revalidatePath("/dev/atualizacoes", "page");
  return null;
}
