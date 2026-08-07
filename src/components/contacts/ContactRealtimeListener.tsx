"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onRealtime } from "@/lib/realtime/client";

/**
 * Atualiza a árvore de Server Components deste contato quando muda algo da
 * timeline geral (notas, ligações, follow-ups, mudança de etapa, e-mails).
 *
 * WhatsApp NÃO entra aqui de propósito: o WhatsAppChatPanel tem seu próprio
 * gatilho de tempo real, então deixar a mensagem de WhatsApp fora evita
 * refresh dobrado da página a cada mensagem que entra/sai.
 */
export function ContactRealtimeListener({ contactId }: { contactId: string }) {
  const router = useRouter();

  useEffect(() => {
    return onRealtime((event) => {
      if (event.contactId !== contactId) return;
      if (event.table === "whatsapp_messages") return;
      router.refresh();
    });
  }, [contactId, router]);

  return null;
}
