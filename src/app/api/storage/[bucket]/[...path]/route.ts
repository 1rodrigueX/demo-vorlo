import { NextResponse } from "next/server";
import { getObject, isStorageBucket, verifySignedUrl } from "@/lib/storage/driver";
import { logSecurityEvent, getClientIp, getUserAgent } from "@/lib/security/events";

/**
 * Serve um arquivo do disco a partir de uma URL assinada — o equivalente ao
 * link temporário que o Storage do Supabase devolvia.
 *
 * Sem sessão de propósito: a URL vai dentro de uma tag <img> ou de um link de
 * download, que não carregam cookie de autenticação em todo contexto. Quem
 * autoriza é a assinatura: ela cobre bucket, caminho e validade, então um link
 * vazado para de funcionar sozinho e ninguém consegue forjar o caminho de
 * outro arquivo.
 *
 * Só responde quando STORAGE_DRIVER=local; com o Supabase ativo as URLs
 * apontam direto pra lá e esta rota nunca é chamada.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path } = await params;

  if (!isStorageBucket(bucket)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const objectPath = path.map(decodeURIComponent).join("/");
  const { searchParams } = new URL(request.url);

  if (!verifySignedUrl(bucket, objectPath, searchParams.get("exp"), searchParams.get("sig"))) {
    // Mesma resposta pra assinatura errada e link vencido: não interessa
    // ajudar quem está tentando adivinhar. Registra só quando veio uma
    // assinatura (tentativa de forjar), não quando faltou (link velho comum).
    if (searchParams.get("sig")) {
      void logSecurityEvent({
        type: "signed_url_invalid",
        ip: getClientIp(request),
        userAgent: getUserAgent(request),
        detail: { bucket, path: objectPath },
      });
    }
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 403 });
  }

  const file = await getObject(bucket, objectPath);
  if (!file) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const fileName = objectPath.split("/").pop() ?? "arquivo";

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": guessContentType(fileName),
      "Content-Length": String(file.length),
      // Privado: o link é temporário, então nenhum intermediário deve guardar.
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}

/**
 * O tipo não é guardado junto do arquivo, então sai da extensão. Só os
 * formatos que o CRM realmente envia; o resto vira download genérico, que é o
 * comportamento seguro pra conteúdo que o navegador não deveria interpretar.
 */
function guessContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    opus: "audio/ogg",
    mp4: "video/mp4",
    zip: "application/zip",
    json: "application/json",
    csv: "text/csv",
  };
  return types[ext] ?? "application/octet-stream";
}
