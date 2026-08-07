import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Manifesto de atualização do app desktop, no formato que o updater do Tauri
 * espera. É o endereço configurado em tauri.conf.json → plugins.updater.
 *
 * Público de propósito: o app consulta antes de qualquer login. Não expõe
 * nada sensível — só a versão publicada, a URL do instalador e a assinatura,
 * que já vão distribuídos com o próprio instalador.
 *
 * 204 quando não há versão publicada: é como o Tauri entende "não há nada
 * novo" sem tratar como erro.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // O Tauri chama /api/app/update/{target}/{versão-atual}; aceitamos também a
  // forma com query, que é mais fácil de testar no navegador.
  const platform = searchParams.get("target") || "windows-x86_64";

  const admin = createAdminClient();
  const { data: release } = await admin
    .from("app_releases")
    .select("version, url, signature, notes, published_at")
    .eq("platform", platform)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!release) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(
    {
      version: release.version,
      notes: release.notes ?? "",
      pub_date: release.published_at ?? new Date().toISOString(),
      platforms: {
        [platform]: {
          signature: release.signature,
          url: release.url,
        },
      },
    },
    {
      headers: {
        // Sem cache: publicar uma versão tem que valer na hora, senão o
        // cliente fica horas sem enxergar a atualização.
        "Cache-Control": "no-store",
      },
    },
  );
}
