"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Ban, Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  blockIpManually,
  unblockIp,
  type SecuritySnapshot,
  type SecurityEventRow,
} from "@/lib/actions/security";

const EVENT_LABELS: Record<string, string> = {
  login_success: "Login",
  login_failed: "Login falhou",
  login_blocked: "Login bloqueado",
  logout: "Logout",
  mfa_challenge: "Desafio MFA",
  mfa_failed: "MFA falhou",
  password_reset_requested: "Reset de senha pedido",
  rate_limited: "Excesso de requisições",
  cron_unauthorized: "Cron não autorizado",
  api_key_invalid: "Chave de API inválida",
  signed_url_invalid: "Link de arquivo forjado",
  permission_denied: "Acesso negado",
  suspicious_input: "Entrada suspeita",
  ip_blocked: "IP bloqueado",
  ip_unblocked: "IP desbloqueado",
};

export function SecurityPanel({ snapshot }: { snapshot: SecuritySnapshot }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [newIp, setNewIp] = useState("");
  const [reason, setReason] = useState("");

  // Painel "em tempo real": puxa o estado novo a cada 10s. É polling e não
  // WebSocket de propósito — sem somar infra, e 10s é tempo de sobra pra reação
  // humana a um evento de segurança.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(timer);
  }, [router]);

  function handleBlock(permanent: boolean) {
    if (!newIp.trim()) return;
    startBusy(async () => {
      const result = await blockIpManually(newIp, reason, permanent);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`IP ${newIp} bloqueado`);
      setNewIp("");
      setReason("");
      router.refresh();
    });
  }

  function handleUnblock(ip: string) {
    startBusy(async () => {
      const result = await unblockIp(ip);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`IP ${ip} liberado`);
      router.refresh();
    });
  }

  const { counts } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Cibersegurança</h1>
          <p className="mt-1 text-sm text-gray-500">Eventos e defesas da plataforma, atualizados a cada 10s.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <RotateCw size={12} className="animate-spin [animation-duration:3s]" />
          ao vivo
        </span>
      </div>

      {/* Placar das últimas 24h */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Críticos (24h)"
          value={counts.critical24h}
          tone={counts.critical24h > 0 ? "critical" : "ok"}
        />
        <StatTile label="Alertas (24h)" value={counts.warn24h} tone={counts.warn24h > 0 ? "warn" : "ok"} />
        <StatTile label="Eventos (24h)" value={counts.total24h} tone="neutral" />
      </div>

      {/* Bloquear IP */}
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Ban size={15} className="text-red-500" />
          Bloquear um IP
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-xs text-gray-500">Endereço IP</label>
            <Input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="203.0.113.42" />
          </div>
          <div className="flex-[2] min-w-[180px]">
            <label className="mb-1 block text-xs text-gray-500">Motivo</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tentativa de invasão" />
          </div>
          <Button onClick={() => handleBlock(true)} disabled={busy || !newIp.trim()}>
            <Plus size={14} />
            Bloquear
          </Button>
        </div>
      </Card>

      {/* IPs bloqueados */}
      {snapshot.blockedIps.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
            IPs bloqueados ({snapshot.blockedIps.length})
          </div>
          <div className="divide-y divide-gray-100">
            {snapshot.blockedIps.map((blocked) => (
              <div key={blocked.ip} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-900">{blocked.ip}</span>
                    <span
                      className={
                        blocked.source === "manual"
                          ? "rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                          : "rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700"
                      }
                    >
                      {blocked.source === "manual" ? "manual" : "automático"}
                    </span>
                    {blocked.hits > 1 && (
                      <span className="text-[11px] text-gray-400">{blocked.hits} tentativas</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    {blocked.reason}
                    {blocked.expires_at
                      ? ` · expira ${new Date(blocked.expires_at).toLocaleString("pt-BR")}`
                      : " · permanente"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleUnblock(blocked.ip)} disabled={busy}>
                  Liberar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Feed de eventos */}
      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
          Eventos recentes
        </div>
        {snapshot.events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <ShieldCheck size={22} className="text-emerald-500" />
            <p className="text-sm text-gray-500">Nenhum evento de segurança registrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {snapshot.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function EventRow({ event }: { event: SecurityEventRow }) {
  const dotColor =
    event.severity === "critical" ? "bg-red-500" : event.severity === "warn" ? "bg-amber-500" : "bg-gray-300";

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {EVENT_LABELS[event.event_type] ?? event.event_type}
          </span>
          {event.ip && <span className="font-mono text-xs text-gray-400">{event.ip}</span>}
        </div>
        {Object.keys(event.detail).length > 0 && (
          <p className="mt-0.5 truncate text-xs text-gray-500">{JSON.stringify(event.detail)}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-gray-400">
        {new Date(event.created_at).toLocaleTimeString("pt-BR")}
      </span>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "critical" | "warn" | "ok" | "neutral";
}) {
  const toneClasses = {
    critical: "border-red-200 bg-red-50",
    warn: "border-amber-200 bg-amber-50",
    ok: "border-emerald-200 bg-emerald-50",
    neutral: "border-gray-200 bg-panel",
  }[tone];

  const Icon = tone === "critical" ? ShieldAlert : ShieldCheck;
  const iconColor = tone === "critical" ? "text-red-500" : tone === "warn" ? "text-amber-500" : "text-emerald-500";

  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {tone !== "neutral" && <Icon size={18} className={iconColor} />}
      </div>
      <p className="mt-1 text-xs text-gray-600">{label}</p>
    </div>
  );
}
