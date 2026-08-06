"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  saveKommoConnection,
  testKommoConnection,
  disconnectKommo,
  type ActionState,
} from "@/lib/actions/kommo";

export function KommoIntegrationCard({
  status,
  subdomain,
  accountName,
  lastError,
  lastTestedAt,
  tenantSlug,
}: {
  status: "disconnected" | "connected" | "error";
  subdomain: string | null;
  accountName: string | null;
  lastError: string | null;
  lastTestedAt: string | null;
  tenantSlug: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(saveKommoConnection, null);
  const [isTesting, startTest] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Kommo conectado");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  function handleTest() {
    startTest(async () => {
      const result = await testKommoConnection();
      if (result?.error) toast.error(result.error);
      else toast.success("Conexão funcionando");
      router.refresh();
    });
  }

  function handleDisconnect() {
    startDisconnect(async () => {
      const result = await disconnectKommo();
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
        Traga seus leads, contatos, empresas, funis e campos personalizados do Kommo. No Kommo, crie uma
        integração privada em <span className="font-medium">Configurações › Integrações</span> e gere a chave
        de acesso de longa duração.
      </p>

      {subdomain && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2">
            {status === "connected" ? (
              <Badge className="bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={12} className="mr-1" /> Conectado
              </Badge>
            ) : status === "error" ? (
              <Badge className="bg-red-50 text-red-700">
                <AlertCircle size={12} className="mr-1" /> Erro
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600">Desconectado</Badge>
            )}
            <span className="font-mono text-xs text-gray-500">
              {subdomain}.kommo.com
              {accountName && accountName !== subdomain ? ` · ${accountName}` : ""}
            </span>
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

      {status === "connected" && (
        <Link
          href={`/${tenantSlug}/settings/integracoes/kommo`}
          className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Importar dados do Kommo
          <ArrowRight size={15} />
        </Link>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="kommo-subdomain">Subdomínio</Label>
          <Input
            id="kommo-subdomain"
            name="subdomain"
            placeholder="minhaempresa"
            defaultValue={subdomain ?? ""}
            required
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-400">
            É o começo do endereço da sua conta: <span className="font-mono">minhaempresa</span>.kommo.com
          </p>
        </div>

        <div>
          <Label htmlFor="kommo-token">Token de acesso de longa duração</Label>
          <Input id="kommo-token" name="token" type="password" placeholder="eyJ0eXAiOi..." required autoComplete="off" />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={isPending}>
            {subdomain ? "Salvar novos dados" : "Conectar"}
          </Button>
          {subdomain && (
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
  );
}
