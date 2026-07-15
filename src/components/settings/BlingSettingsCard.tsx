"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { updateBlingCredentials, disconnectBling, type ActionState } from "@/lib/actions/bling";
import type { BlingConnection } from "@/types/domain";

export function BlingSettingsCard({
  connection,
  siteUrl,
}: {
  connection: BlingConnection | null;
  siteUrl: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateBlingCredentials,
    null,
  );
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();
  const wasPending = useRef(false);

  const isConnected = !!connection?.access_token;
  const redirectUri = `${siteUrl}/api/bling/callback`;

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Credenciais do Bling salvas");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  function handleDisconnect() {
    startDisconnect(async () => {
      const result = await disconnectBling();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (isConnected) {
    return (
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={16} />
          Conectado ao Bling
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          isLoading={isDisconnecting}
          onClick={handleDisconnect}
        >
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Crie um app OAuth na sua conta Bling em{" "}
        <a
          href="https://developer.bling.com.br"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-indigo-600 hover:underline"
        >
          developer.bling.com.br
        </a>{" "}
        e cole aqui o Client ID e o Client Secret gerados.
      </p>

      <div>
        <Label>URL de redirecionamento (usar no cadastro do app no Bling)</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={redirectUri} className="bg-gray-50 text-gray-600" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(redirectUri);
              toast.success("URL copiada");
            }}
          >
            <Copy size={14} />
          </Button>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="clientId">Client ID</Label>
          <Input id="clientId" name="clientId" required defaultValue={connection?.client_id ?? ""} />
        </div>
        <div>
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            name="clientSecret"
            type="password"
            required
            defaultValue={connection?.client_secret ?? ""}
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" isLoading={isPending}>
            Salvar credenciais
          </Button>
          {connection?.client_id && connection?.client_secret && (
            <a href="/api/bling/authorize">
              <Button type="button">
                <ExternalLink size={14} />
                Conectar com Bling
              </Button>
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
