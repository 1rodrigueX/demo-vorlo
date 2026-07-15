"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { QrCode, CheckCircle2 } from "lucide-react";
import { WhatsAppConnectionPanel } from "@/components/settings/WhatsAppConnectionPanel";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { WhatsAppListRealtimeListener } from "@/components/whatsapp/WhatsAppListRealtimeListener";
import { Modal } from "@/components/ui/Modal";
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
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [everConnected, setEverConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/whatsapp/baileys/status", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const data: StatusResponse = await res.json();
          if (data.status === "connected") setEverConnected(true);
          setStatus(data.status);
          setPhoneNumber(data.phoneNumber);

          // Abre o modal de conexão sozinho na primeira vez que aparecer um QR
          // pra escanear nesta sessão — depois disso, o botão continua ali pra
          // reabrir quando quiser (reconectar, trocar de número, etc.).
          if (data.status === "qr" && !autoOpenedRef.current) {
            autoOpenedRef.current = true;
            setShowConnectModal(true);
          }
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

  return (
    <div className="flex h-[calc(100vh-4rem-3rem)] overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
      <WhatsAppListRealtimeListener />
      <div className="flex w-80 shrink-0 flex-col border-r border-gray-200">
        <button
          type="button"
          onClick={() => setShowConnectModal(true)}
          className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-xs font-medium transition-colors hover:bg-gray-50"
        >
          {status === "connected" ? (
            <>
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span className="truncate text-gray-600">
                Conectado{phoneNumber ? `: ${phoneNumber}` : ""}
              </span>
            </>
          ) : (
            <>
              <QrCode size={14} className="shrink-0 text-amber-600" />
              <span className="text-amber-700">Conectar WhatsApp</span>
            </>
          )}
        </button>
        {status === "connecting" && everConnected && (
          <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-700">
            Reconectando...
          </div>
        )}
        <div className="min-h-0 flex-1">
          <ConversationList conversations={conversations} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>

      <Modal
        open={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        title="Conectar WhatsApp"
      >
        <WhatsAppConnectionPanel />
      </Modal>
    </div>
  );
}
