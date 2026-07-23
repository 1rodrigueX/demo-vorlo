"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  saveAnthropicKey,
  testAnthropicConnection,
  disconnectAnthropicKey,
  type ActionState,
} from "@/lib/actions/tenant-integrations";

export function AnthropicSettingsCard({
  status,
  keyPreview,
  lastError,
  lastTestedAt,
}: {
  status: "disconnected" | "connected" | "error";
  keyPreview: string | null;
  lastError: string | null;
  lastTestedAt: string | null;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    saveAnthropicKey,
    null,
  );
  const [isTesting, startTest] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Chave da Anthropic conectada");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  function handleTest() {
    startTest(async () => {
      const result = await testAnthropicConnection();
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Conexão funcionando");
      }
      router.refresh();
    });
  }

  function handleDisconnect() {
    startDisconnect(async () => {
      const result = await disconnectAnthropicKey();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        O Synexa (aba Suporte) já funciona automaticamente neste CRM. Conecte sua própria chave
        da API da Anthropic se quiser usar outros agentes de IA (SDR, atendente, etc). Gere uma
        em{" "}
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-indigo-600 hover:underline"
        >
          console.anthropic.com/settings/keys
        </a>
        .
      </p>

      {keyPreview && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2">
            {status === "connected" ? (
              <Badge className="bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={12} className="mr-1" /> Conectada
              </Badge>
            ) : status === "error" ? (
              <Badge className="bg-red-50 text-red-700">
                <AlertCircle size={12} className="mr-1" /> Erro
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600">Desconectada</Badge>
            )}
            <span className="font-mono text-xs text-gray-500">{keyPreview}</span>
          </div>
          {lastTestedAt && (
            <span className="text-xs text-gray-400">
              testado em {new Date(lastTestedAt).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      )}

      {status === "error" && lastError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{lastError}</p>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="apiKey">Chave da API (Anthropic)</Label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder="sk-ant-..."
            required
            autoComplete="off"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={isPending}>
            {keyPreview ? "Salvar nova chave" : "Salvar e conectar"}
          </Button>
          {keyPreview && (
            <>
              <Button type="button" variant="secondary" isLoading={isTesting} onClick={handleTest}>
                Testar conexão
              </Button>
              <Button
                type="button"
                variant="ghost"
                isLoading={isDisconnecting}
                onClick={handleDisconnect}
              >
                Desconectar
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
