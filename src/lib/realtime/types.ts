/**
 * Tipos do canal de tempo real, compartilhados entre servidor (bus/SSE) e
 * cliente (EventSource). Fica separado do bus.ts porque aquele é server-only e
 * o cliente no browser precisa só do formato do evento.
 */

export type RealtimeTable = "whatsapp_messages" | "email_messages" | "activities";

export type RealtimeEvent = {
  tenantId: string;
  table: RealtimeTable;
  event: "INSERT" | "UPDATE";
  /** Contato afetado, quando dá pra saber — os consumidores filtram por ele. */
  contactId: string | null;
};
