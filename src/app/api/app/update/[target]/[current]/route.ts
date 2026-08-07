import { GET as manifestHandler } from "@/app/api/app/update/route";

/**
 * O updater do Tauri monta a URL como
 * `{endpoint}/{target}/{versão instalada}` quando o endpoint tem os
 * placeholders. Esta rota só repassa pro handler principal, mantendo a
 * lógica num lugar só.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ target: string; current: string }> },
) {
  const { target } = await params;
  const url = new URL(request.url);
  url.searchParams.set("target", target);

  return manifestHandler(new Request(url, request));
}
