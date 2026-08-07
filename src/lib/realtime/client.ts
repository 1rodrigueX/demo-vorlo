"use client";

import type { RealtimeEvent } from "@/lib/realtime/types";

/**
 * Cliente do canal de tempo real no browser. Mantém UM EventSource
 * compartilhado por toda a aba (contagem de referência): não importa quantos
 * componentes assinem — inbox, painel de chat, timeline — é uma conexão só.
 *
 * No lugar do `createClient().channel(...).on("postgres_changes")` do Supabase.
 */

type Handler = (event: RealtimeEvent) => void;

const handlers = new Set<Handler>();
let source: EventSource | null = null;

function ensureConnected() {
  if (source || typeof window === "undefined") return;

  source = new EventSource("/api/realtime");
  source.onmessage = (e) => {
    let parsed: RealtimeEvent;
    try {
      parsed = JSON.parse(e.data) as RealtimeEvent;
    } catch {
      return;
    }
    for (const handler of handlers) handler(parsed);
  };
  // onerror: o próprio EventSource reconecta sozinho. Só limpamos a referência
  // se ele fechar de vez (readyState CLOSED), pra uma próxima assinatura poder
  // reabrir do zero.
  source.onerror = () => {
    if (source?.readyState === EventSource.CLOSED) {
      source = null;
      if (handlers.size > 0) ensureConnected();
    }
  };
}

/** Assina os eventos de tempo real. Devolve a função de cancelamento. */
export function onRealtime(handler: Handler): () => void {
  handlers.add(handler);
  ensureConnected();

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0 && source) {
      source.close();
      source = null;
    }
  };
}
