"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { saveFunnelSettings, type ActionState } from "@/lib/actions/funnel-automation";

export type FunnelSettingsView = {
  enabled: boolean;
  followup_delay_hours: number;
  followup_message: string;
  followup_tag_name: string;
  inactive_delay_hours: number;
  inactive_tag_name: string;
  won_message_enabled: boolean;
  won_message: string;
};

export function FunnelAutomationCard({
  settings,
  canEdit,
}: {
  settings: FunnelSettingsView;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(saveFunnelSettings, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Automações de funil salvas");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form action={formAction} className="space-y-6">
      <p className="text-sm text-gray-500">
        Depois que uma proposta é marcada como enviada, o CRM faz o follow-up sozinho: envia a
        mensagem, aplica a tag, move o lead para <strong>Fechamento</strong> e, se ele não responder,
        para <strong>Inativo</strong>. Use <code className="rounded bg-gray-100 px-1">{"{nome}"}</code>{" "}
        na mensagem para inserir o primeiro nome do lead.
      </p>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={settings.enabled}
          disabled={!canEdit}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="font-medium text-gray-900">Ativar automações de funil</span>
      </label>

      {/* ── Follow-up de proposta ─────────────────────────────────────────── */}
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4" disabled={!canEdit}>
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Follow-up de proposta
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="followup_delay_hours">Disparar após (horas)</Label>
            <Input
              id="followup_delay_hours"
              name="followup_delay_hours"
              type="number"
              min={1}
              max={720}
              defaultValue={settings.followup_delay_hours}
            />
          </div>
          <div>
            <Label htmlFor="followup_tag_name">Tag aplicada</Label>
            <Input id="followup_tag_name" name="followup_tag_name" defaultValue={settings.followup_tag_name} />
          </div>
        </div>

        <div>
          <Label htmlFor="followup_message">Mensagem de follow-up</Label>
          <Textarea
            id="followup_message"
            name="followup_message"
            rows={3}
            defaultValue={settings.followup_message}
          />
        </div>
      </fieldset>

      {/* ── Inatividade ──────────────────────────────────────────────────── */}
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4" disabled={!canEdit}>
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Cliente inativo
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="inactive_delay_hours">Sem resposta por (horas)</Label>
            <Input
              id="inactive_delay_hours"
              name="inactive_delay_hours"
              type="number"
              min={1}
              max={720}
              defaultValue={settings.inactive_delay_hours}
            />
          </div>
          <div>
            <Label htmlFor="inactive_tag_name">Tag aplicada</Label>
            <Input id="inactive_tag_name" name="inactive_tag_name" defaultValue={settings.inactive_tag_name} />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Se o lead não responder nesse prazo após o follow-up, ele vai para a coluna Inativo.
        </p>
      </fieldset>

      {/* ── Venda ganha ──────────────────────────────────────────────────── */}
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4" disabled={!canEdit}>
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Mensagem de venda ganha
        </legend>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="won_message_enabled"
            defaultChecked={settings.won_message_enabled}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-900">Enviar mensagem ao marcar o negócio como ganho</span>
        </label>

        <div>
          <Label htmlFor="won_message">Mensagem</Label>
          <Textarea id="won_message" name="won_message" rows={2} defaultValue={settings.won_message} />
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      {canEdit ? (
        <Button type="submit" isLoading={isPending}>
          Salvar automações
        </Button>
      ) : (
        <p className="text-xs text-gray-400">Só administradores podem editar as automações de funil.</p>
      )}
    </form>
  );
}
