import { getCurrentUser } from "@/lib/auth/current-user";
import { subscribeChanges, type RealtimeEvent } from "@/lib/realtime/bus";

// EventEmitter é do Node; e um stream que fica aberto nunca pode ser
// cacheado/prerenderizado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canal de tempo real (SSE) que substitui o Realtime do Supabase. O browser
 * abre um EventSource aqui (ver lib/realtime/client) e recebe sinais de
 * mudança do PRÓPRIO tenant — filtragem por contato/tabela é feita no cliente.
 *
 * Um heartbeat a cada 25s evita que proxies (nginx na frente da app) derrubem
 * a conexão ociosa; o EventSource reconecta sozinho se cair.
 */
export async function GET() {
  const current = await getCurrentUser();
  const tenantId = current?.profile?.tenant_id;
  if (!tenantId) {
    return new Response("Não autenticado", { status: 401 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Comentário inicial: destrava o EventSource (dispara o onopen) e já
      // firma os headers do stream no proxy.
      safeEnqueue(": conectado\n\n");

      const unsubscribe = subscribeChanges(tenantId, (event: RealtimeEvent) => {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => safeEnqueue(": ping\n\n"), 25_000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // já fechado
        }
      };
    },
    cancel() {
      // Cliente desconectou (fechou a aba, navegou): libera listener e timer.
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx: não bufferizar o stream (senão os eventos só chegam em lote).
      "X-Accel-Buffering": "no",
    },
  });
}
