"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Plus, Webhook } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import {
  createLeadWebhook,
  toggleLeadWebhook,
  deleteLeadWebhook,
  type ActionState,
} from "@/lib/actions/lead-webhooks";

type Webhook = {
  id: string;
  name: string;
  token: string;
  target_stage_id: string | null;
  welcome_message: string | null;
  is_active: boolean;
  leads_received: number;
};

type Stage = { id: string; name: string };

function NewWebhookForm({ stages, onSaved }: { stages: Stage[]; onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createLeadWebhook, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      onSaved();
    }
    wasPending.current = isPending;
  }, [isPending, state, onSaved]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="wh-name">Nome</Label>
        <Input id="wh-name" name="name" required placeholder="Ex: Facebook Ads, Site institucional" />
      </div>
      <div>
        <Label htmlFor="wh-stage">Coluna do funil (opcional)</Label>
        <Select id="wh-stage" name="targetStageId" defaultValue="">
          <option value="">Não criar negócio automaticamente</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="wh-welcome">Mensagem de boas-vindas no WhatsApp (opcional)</Label>
        <Textarea
          id="wh-welcome"
          name="welcomeMessage"
          rows={3}
          placeholder="Se o lead informar telefone, essa mensagem é enviada automaticamente."
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" isLoading={isPending} className="w-full">
        Criar webhook
      </Button>
    </form>
  );
}

function WebhookRow({ webhook, stages, siteUrl }: { webhook: Webhook; stages: Stage[]; siteUrl: string }) {
  const [isToggling, startToggle] = useTransition();
  const url = `${siteUrl}/api/public/leads/${webhook.token}`;
  const stageName = stages.find((s) => s.id === webhook.target_stage_id)?.name;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  }

  function handleToggle() {
    startToggle(async () => {
      const result = await toggleLeadWebhook(webhook.id, !webhook.is_active);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-2 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{webhook.name}</p>
          <p className="text-xs text-gray-500">
            {stageName ? `Cai em "${stageName}"` : "Não cria negócio"} · {webhook.leads_received} lead
            {webhook.leads_received === 1 ? "" : "s"} recebido{webhook.leads_received === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" size="sm" isLoading={isToggling} onClick={handleToggle}>
            {webhook.is_active ? "Ativo" : "Pausado"}
          </Button>
          <ConfirmDeleteButton
            action={() => deleteLeadWebhook(webhook.id)}
            confirmMessage={`Excluir o webhook "${webhook.name}"? Formulários que apontam pra essa URL param de funcionar.`}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
        <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
          <Copy size={14} />
        </Button>
      </div>
    </div>
  );
}

export function LeadWebhooksManager({
  webhooks,
  stages,
  siteUrl,
}: {
  webhooks: Webhook[];
  stages: Stage[];
  siteUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Webhooks de lead</h2>
          <p className="mt-1 text-sm text-gray-500">
            Envie leads de formulários externos (landing page, Facebook Ads etc.) direto pro funil.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Novo webhook
        </Button>
      </div>

      {!webhooks.length ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-gray-500">
          <Webhook size={24} className="text-gray-300" />
          Nenhum webhook criado ainda.
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100 overflow-hidden">
          {webhooks.map((w) => (
            <WebhookRow key={w.id} webhook={w} stages={stages} siteUrl={siteUrl} />
          ))}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo webhook de lead">
        <NewWebhookForm stages={stages} onSaved={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
