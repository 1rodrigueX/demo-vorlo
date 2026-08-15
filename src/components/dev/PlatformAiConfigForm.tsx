"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  savePlatformAiConfig,
  testPlatformAiConnection,
  disconnectPlatformAiConfig,
  type ActionState,
} from "@/lib/actions/platform-ai-config";
import type { PlatformAiConfig } from "@/lib/openai/platformConfig";

export function PlatformAiConfigForm({ config }: { config: PlatformAiConfig }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(savePlatformAiConfig, null);
  const [isTesting, startTest] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) toast.success("Chave da plataforma conectada");
    wasPending.current = isPending;
  }, [isPending, state]);

  function handleTest() {
    startTest(async () => {
      const result = await testPlatformAiConnection();
      if (result?.error) toast.error(result.error);
      else toast.success("Conexão funcionando");
      router.refresh();
    });
  }

  function handleDisconnect() {
    startDisconnect(async () => {
      const result = await disconnectPlatformAiConfig();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="max-w-xl p-6">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Banca o Vorlo (aba Suporte) em todo tenant, sempre — mesmo quando o tenant conecta a
          própria chave pra usar outros agentes (SDR, atendente etc). Antes só dava pra trocar via
          SSH (env var <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">PLATFORM_OPENAI_API_KEY</code>);
          agora é aqui. Gere uma chave em{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-indigo-600 hover:underline"
          >
            platform.openai.com/api-keys
          </a>
          {" "}— lembrando que a conta precisa ter crédito, senão toda chamada falha com 401/429.
        </p>

        {config.apiKeyPreview && (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2">
              {config.status === "connected" ? (
                <Badge className="bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={12} className="mr-1" /> Conectada
                </Badge>
              ) : config.status === "error" ? (
                <Badge className="bg-red-50 text-red-700">
                  <AlertCircle size={12} className="mr-1" /> Erro
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-600">Desconectada</Badge>
              )}
              <span className="font-mono text-xs text-gray-500">{config.apiKeyPreview}</span>
            </div>
            {config.lastTestedAt && (
              <span className="text-xs text-gray-400">
                testado em {new Date(config.lastTestedAt).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        )}

        {config.status === "error" && config.lastError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{config.lastError}</p>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="apiKey">Chave da API (OpenAI)</Label>
            <Input id="apiKey" name="apiKey" type="password" placeholder="sk-..." required autoComplete="off" />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={isPending}>
              {config.apiKeyPreview ? "Salvar nova chave" : "Salvar e conectar"}
            </Button>
            {config.apiKeyPreview && (
              <>
                <Button type="button" variant="secondary" isLoading={isTesting} onClick={handleTest}>
                  Testar conexão
                </Button>
                <Button type="button" variant="ghost" isLoading={isDisconnecting} onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
}
