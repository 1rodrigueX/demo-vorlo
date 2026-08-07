import "server-only";
import { EventEmitter } from "node:events";
import type { RealtimeEvent, RealtimeTable } from "@/lib/realtime/types";

export type { RealtimeEvent, RealtimeTable } from "@/lib/realtime/types";

/**
 * Barramento de eventos em processo, no lugar do Realtime do Supabase.
 *
 * Funciona porque a aplicação roda num processo PM2 único (mesma premissa do
 * baileysClient e do rate limiter, que já guardam estado em globalThis): quem
 * grava a mensagem (webhook do WhatsApp, envio, cron) e quem serve o SSE estão
 * no mesmo processo, então um EventEmitter compartilhado liga os dois sem somar
 * Redis nem depender de LISTEN/NOTIFY do Postgres.
 *
 * Os eventos são SINAIS ("mudou X do contato Y"), não a linha inteira. Quem
 * recebe (ver lib/realtime/client no browser) dá um router.refresh() e relê do
 * servidor — que continua sendo a fonte da verdade e já aplica os filtros de
 * tenant. Mais simples e robusto do que trafegar linha parcial pelo túnel.
 *
 * Se um dia a app escalar pra vários processos, isto vira um LISTEN/NOTIFY ou
 * um Redis pub/sub — só este arquivo muda.
 */

const globalForBus = globalThis as unknown as { __realtimeBus?: EventEmitter };

function bus(): EventEmitter {
  if (!globalForBus.__realtimeBus) {
    const emitter = new EventEmitter();
    // Muitas abas abertas = muitos listeners no mesmo processo; o limite
    // padrão (10) dispararia warning à toa.
    emitter.setMaxListeners(0);
    globalForBus.__realtimeBus = emitter;
  }
  return globalForBus.__realtimeBus;
}

/** Publica uma mudança. Nunca lança — realtime é conforto, não pode derrubar o fluxo que gravou. */
export function publishChange(
  tenantId: string,
  table: RealtimeTable,
  event: "INSERT" | "UPDATE",
  contactId: string | null,
): void {
  try {
    bus().emit("change", { tenantId, table, event, contactId } satisfies RealtimeEvent);
  } catch (err) {
    console.error("publishChange falhou (ignorado):", err);
  }
}

/** Assina as mudanças de um tenant. Devolve a função de cancelamento. */
export function subscribeChanges(tenantId: string, handler: (event: RealtimeEvent) => void): () => void {
  const listener = (event: RealtimeEvent) => {
    if (event.tenantId === tenantId) handler(event);
  };
  bus().on("change", listener);
  return () => bus().off("change", listener);
}
