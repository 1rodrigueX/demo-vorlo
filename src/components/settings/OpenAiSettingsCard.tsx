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
  saveOpenAiKey,
  testOpenAiConnection,
  disconnectOpenAiKey,
  type ActionState,
} from "@/lib/actions/tenant-integrations";

export function OpenAiSettingsCard({
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
    saveOpenAiKey,
    null,
  );
  const [isTesting, startTest] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Chave da OpenAI conectada");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  function handleTest() {
    startTest(async () => {
      const result = await testOpenAiConnection();
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
      const result = await disconnectOpenAiKey();
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
        O Vorlo (aba Suporte) já funciona automaticamente neste CRM. Conecte sua própria chave da
        API da OpenAI pra usar os seus agentes de IA (SDR, atendente, etc) — são eles que atendem
        os seus clientes, e o consumo é cobrado na sua conta da OpenAI.
      </p>

      <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Como pegar minha chave da OpenAI (passo a passo)
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-600">
          <li>
            Acesse{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:underline"
            >
              platform.openai.com/api-keys
            </a>{" "}
            e entre com sua conta (criar é grátis).
          </li>
          <li>
            <strong>Antes de gerar a chave</strong>, adicione crédito em{" "}
            <span className="font-medium">Settings → Billing → Add to credit balance</span>. Sem
            crédito a chave até é criada, mas toda chamada falha e os agentes ficam mudos.
          </li>
          <li>
            Clique em <span className="font-medium">Create new secret key</span>, dê um nome que
            você reconheça depois (ex: &quot;CRM Vorlo&quot;) e confirme.
          </li>
          <li>
            <strong>Copie a chave na hora</strong> — ela começa com <code>sk-</code> e só aparece
            uma vez. Se fechar a janela sem copiar, não dá pra ver de novo: só criar outra.
          </li>
          <li>Cole no campo abaixo e clique em Salvar. O CRM testa a chave na hora.</li>
        </ol>
      </details>

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
          <Label htmlFor="apiKey">Chave da API (OpenAI)</Label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder="sk-..."
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
