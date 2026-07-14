"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WhatsAppConnectionPanel } from "@/components/settings/WhatsAppConnectionPanel";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { WhatsAppListRealtimeListener } from "@/components/whatsapp/WhatsAppListRealtimeListener";
import type { Conversation } from "@/lib/whatsapp/getConversations";

type StatusResponse = {
  status: "connecting" | "qr" | "connected";
  qrDataUrl: string | null;
  phoneNumber: string | null;
};

export function WhatsAppInboxShell({
  conversations,
  children,
}: {
  conversations: Conversation[];
  children: ReactNode;
}) {
  const [status, setStatus] = useState<StatusResponse["status"]>("connecting");
  const [everConnected, setEverConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/whatsapp/baileys/status", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const data: StatusResponse = await res.json();
          if (data.status === "connected") setEverConnected(true);
          setStatus(data.status);
        }
      } catch {
        // silencioso — tenta de novo no próximo tick
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Só mostra a tela cheia do QR quando realmente precisa escanear.
  // "connecting" acontece também em reconexões automáticas momentâneas —
  // não vale a pena esconder a caixa de entrada toda por isso.
  if (status === "qr") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <WhatsAppConnectionPanel />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem-3rem)] overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
      <WhatsAppListRealtimeListener />
      <div className="w-80 shrink-0 border-r border-gray-200">
        {status === "connecting" && everConnected && (
          <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-700">
            Reconectando...
          </div>
        )}
        <ConversationList conversations={conversations} />
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
