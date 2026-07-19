"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { saveDiscordConfig, saveAndTestDiscordConfig, type ActionState } from "@/lib/actions/discord-config";

type InitialConfig = {
  botToken: string | null;
  publicKey: string | null;
  applicationId: string | null;
  logChannelId: string | null;
};

export function DiscordConfigForm({ initial }: { initial: InitialConfig }) {
  const [saveState, saveAction, isSaving] = useActionState<ActionState, FormData>(saveDiscordConfig, null);
  const [testState, testAction, isTesting] = useActionState<ActionState, FormData>(saveAndTestDiscordConfig, null);

  const wasSaving = useRef(false);
  useEffect(() => {
    if (wasSaving.current && !isSaving && !saveState?.error) toast.success("Salvo");
    wasSaving.current = isSaving;
  }, [isSaving, saveState]);

  const wasTesting = useRef(false);
  useEffect(() => {
    if (wasTesting.current && !isTesting) {
      if (testState?.error) toast.error(testState.error);
      else toast.success("Salvo e mensagem de teste enviada — confere o canal no Discord");
    }
    wasTesting.current = isTesting;
  }, [isTesting, testState]);

  const error = saveState?.error ?? testState?.error;

  return (
    <Card className="max-w-xl p-6">
      <form className="space-y-4">
        <div>
          <Label htmlFor="botToken">Bot Token</Label>
          <PasswordInput id="botToken" name="botToken" defaultValue={initial.botToken ?? ""} required />
          <p className="mt-1 text-xs text-gray-400">Discord Developer Portal → seu app → Bot → Reset Token</p>
        </div>
        <div>
          <Label htmlFor="publicKey">Public Key</Label>
          <Input id="publicKey" name="publicKey" defaultValue={initial.publicKey ?? ""} required />
          <p className="mt-1 text-xs text-gray-400">Aba General Information do app</p>
        </div>
        <div>
          <Label htmlFor="logChannelId">ID do canal de log</Label>
          <Input id="logChannelId" name="logChannelId" defaultValue={initial.logChannelId ?? ""} required />
          <p className="mt-1 text-xs text-gray-400">
            No Discord: botão direito no canal → Copy Channel ID (precisa do Modo Desenvolvedor ativado)
          </p>
        </div>
        <div>
          <Label htmlFor="applicationId">Application ID (opcional)</Label>
          <Input id="applicationId" name="applicationId" defaultValue={initial.applicationId ?? ""} />
          <p className="mt-1 text-xs text-gray-400">
            Só usado se você for registrar/atualizar os comandos /status e /stats de novo depois
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" formAction={saveAction} isLoading={isSaving}>
            Salvar
          </Button>
          <Button type="submit" formAction={testAction} variant="secondary" isLoading={isTesting}>
            Salvar e testar
          </Button>
        </div>
      </form>
    </Card>
  );
}
