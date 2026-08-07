"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, Play, Pause, XCircle, Trash2, Users, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  createCampaign,
  scheduleCampaign,
  pauseCampaign,
  cancelCampaign,
  deleteCampaign,
  previewAudience,
} from "@/lib/actions/campaigns";

export type CampaignItem = {
  id: string;
  name: string;
  message: string;
  status: "draft" | "scheduled" | "running" | "paused" | "done" | "canceled";
  error: string | null;
  created_at: string;
  counts: { total: number; sent: number; failed: number; pending: number; optedOut: number };
};

export type Option = { id: string; label: string };

export function CampaignsManager({
  campaigns,
  stages,
  tags,
  sellers,
}: {
  campaigns: CampaignItem[];
  stages: Option[];
  tags: Option[];
  sellers: Option[];
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [variants, setVariants] = useState("");
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [dailyCap, setDailyCap] = useState(200);
  const [preview, setPreview] = useState<number | null>(null);
  const [busy, startBusy] = useTransition();
  const router = useRouter();

  const audience = { stageIds, tagIds, ownerIds, onlyWithPhone: true };

  function handlePreview() {
    startBusy(async () => {
      const result = await previewAudience(audience);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPreview(result.total);
    });
  }

  function handleCreate() {
    startBusy(async () => {
      const result = await createCampaign({
        name,
        message,
        variants: variants.split("\n---\n").map((v) => v.trim()).filter(Boolean),
        audience,
        dailyCap,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Campanha criada como rascunho");
      setName("");
      setMessage("");
      setVariants("");
      setPreview(null);
      router.refresh();
    });
  }

  function handleSchedule(campaign: CampaignItem) {
    if (!confirm(`Iniciar "${campaign.name}"? A lista de destinatários é congelada agora.`)) return;
    startBusy(async () => {
      const result = await scheduleCampaign(campaign.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Agendada para ${result.total} contatos`);
      router.refresh();
    });
  }

  function runAction(fn: () => Promise<{ error?: string } | null>, success: string) {
    startBusy(async () => {
      const result = await fn();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Disparos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mensagem em massa no WhatsApp para um grupo de contatos.
        </p>
      </div>

      <Card className="flex items-start gap-3 border-amber-200 bg-amber-50/60 p-4">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900">
          <p className="font-medium">O ritmo é lento de propósito.</p>
          <p className="mt-1 text-amber-800">
            Disparo rápido demais faz o WhatsApp banir o número — e junto vai o histórico de conversa de todos
            os seus clientes. O envio respeita a janela das 8h às 20h, sorteia intervalos entre as mensagens e
            começa com teto baixo, que cresce conforme o número ganha reputação. Quem pediu para não receber
            fica de fora automaticamente.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Nova campanha</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Nome (só você vê)</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Promoção de setembro"
            />
          </div>

          <div>
            <Label htmlFor="campaign-message">Mensagem</Label>
            <Textarea
              id="campaign-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Oi {nome}! Tudo bem?"
            />
            <p className="mt-1 text-xs text-gray-400">Use {"{nome}"} para o primeiro nome do contato.</p>
          </div>

          <div>
            <Label htmlFor="campaign-variants">Variações (opcional)</Label>
            <Textarea
              id="campaign-variants"
              rows={4}
              value={variants}
              onChange={(e) => setVariants(e.target.value)}
              placeholder={"Segunda versão da mensagem\n---\nTerceira versão"}
            />
            <p className="mt-1 text-xs text-gray-400">
              Separe cada versão com uma linha contendo <code>---</code>. O sistema sorteia uma por envio —
              mil mensagens idênticas é o que os filtros de spam procuram.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MultiSelect label="Etapas do funil" options={stages} selected={stageIds} onChange={setStageIds} />
            <MultiSelect label="Tags" options={tags} selected={tagIds} onChange={setTagIds} />
            <MultiSelect label="Vendedores" options={sellers} selected={ownerIds} onChange={setOwnerIds} />
          </div>
          <p className="text-xs text-gray-400">
            Sem nenhum filtro marcado, a campanha vai para todos os contatos com telefone.
          </p>

          <div className="max-w-xs">
            <Label htmlFor="campaign-cap">Limite por dia</Label>
            <Input
              id="campaign-cap"
              type="number"
              min={1}
              max={1000}
              value={dailyCap}
              onChange={(e) => setDailyCap(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-400">
              Nos primeiros dias o sistema usa um teto menor que este, para aquecer o número.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleCreate} isLoading={busy} disabled={!name.trim() || message.trim().length < 5}>
              <Megaphone size={15} />
              Criar rascunho
            </Button>
            <Button variant="secondary" onClick={handlePreview} isLoading={busy}>
              <Users size={15} />
              {preview === null ? "Ver quantos recebem" : `${preview} contatos`}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <Card className="p-8 text-center text-sm text-gray-500">Nenhuma campanha ainda.</Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{campaign.name}</h3>
                    <StatusPill status={campaign.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{campaign.message}</p>

                  {campaign.counts.total > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {campaign.counts.sent} de {campaign.counts.total} enviadas
                      {campaign.counts.failed > 0 && ` · ${campaign.counts.failed} falharam`}
                      {campaign.counts.optedOut > 0 && ` · ${campaign.counts.optedOut} descadastrados`}
                    </p>
                  )}
                  {campaign.error && <p className="mt-1.5 text-xs text-amber-700">{campaign.error}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {(campaign.status === "draft" || campaign.status === "paused") && (
                    <Button size="sm" onClick={() => handleSchedule(campaign)} disabled={busy}>
                      <Play size={14} />
                      {campaign.status === "paused" ? "Retomar" : "Iniciar"}
                    </Button>
                  )}
                  {(campaign.status === "scheduled" || campaign.status === "running") && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => runAction(() => pauseCampaign(campaign.id), "Campanha pausada")}
                      >
                        <Pause size={14} />
                        Pausar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => runAction(() => cancelCampaign(campaign.id), "Campanha cancelada")}
                      >
                        <XCircle size={14} />
                        Cancelar
                      </Button>
                    </>
                  )}
                  {["draft", "done", "canceled"].includes(campaign.status) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (confirm("Apagar esta campanha?")) {
                          runAction(() => deleteCampaign(campaign.id), "Campanha apagada");
                        }
                      }}
                      className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600"
                      aria-label="Apagar campanha"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (!options.length) return null;

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id),
                )
              }
              className="h-3.5 w-3.5 accent-indigo-600"
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: CampaignItem["status"] }) {
  const map: Record<CampaignItem["status"], { label: string; className: string }> = {
    draft: { label: "Rascunho", className: "bg-gray-100 text-gray-600" },
    scheduled: { label: "Agendada", className: "bg-indigo-50 text-indigo-700" },
    running: { label: "Enviando", className: "bg-indigo-50 text-indigo-700" },
    paused: { label: "Pausada", className: "bg-amber-50 text-amber-700" },
    done: { label: "Concluída", className: "bg-emerald-50 text-emerald-700" },
    canceled: { label: "Cancelada", className: "bg-gray-100 text-gray-500" },
  };
  const { label, className } = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{label}</span>;
}
