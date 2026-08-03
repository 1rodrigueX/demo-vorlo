"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, QrCode } from "lucide-react";
import { Card } from "@/components/ui/Card";

type StatusResponse = {
  status: "connecting" | "qr" | "connected";
  qrDataUrl: string | null;
  phoneNumber: string | null;
};

export function WhatsAppConnectionPanel() {
  const [data, setData] = useState<StatusResponse>({
    status: "connecting",
    qrDataUrl: null,
    phoneNumber: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // Pausa quando a aba está em segundo plano (retoma no visibilitychange).
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch("/api/whatsapp/baileys/status", { cache: "no-store" });
        if (res.ok && !cancelled) {
          setData(await res.json());
        }
      } catch {
        // silencioso — tenta de novo no próximo tick
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 2000);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <Card className="mx-auto max-w-md p-6 text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          {data.status === "connected" ? <CheckCircle2 size={24} /> : <QrCode size={24} />}
        </div>
      </div>

      <h2 className="mb-1 text-base font-semibold text-gray-900">
        WhatsApp via QR code (número pessoal)
      </h2>

      {data.status === "connecting" && (
        <p className="text-sm text-gray-500">Iniciando conexão...</p>
      )}

      {data.status === "qr" && data.qrDataUrl && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.qrDataUrl}
            alt="QR code para conectar o WhatsApp"
            className="mx-auto h-56 w-56 rounded-md border border-gray-200"
          />
          <p className="mt-3 text-sm text-gray-500">
            No celular: <strong>WhatsApp → Dispositivos conectados → Conectar dispositivo</strong> e
            escaneie este código.
          </p>
        </div>
      )}

      {data.status === "connected" && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">Conectado com sucesso</p>
          {data.phoneNumber && (
            <p className="mt-1 text-lg font-semibold text-gray-900">{data.phoneNumber}</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Mensagens enviadas por este canal saem do WhatsApp do seu celular.
          </p>
        </div>
      )}
    </Card>
  );
}
