"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { saveYoutubeApiKey, removeYoutubeApiKey, type ActionState } from "@/lib/actions/youtube";

function maskApiKey(apiKey: string): string {
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

export function YoutubeSettingsCard({ apiKey }: { apiKey: string | null }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(saveYoutubeApiKey, null);
  const [isRemoving, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Chave do YouTube salva");
      formRef.current?.reset();
      router.refresh();
    }
    wasPending.current = isPending;
  }, [isPending, state, router]);

  function handleRemove() {
    startRemove(async () => {
      const result = await removeYoutubeApiKey();
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
        Chave da YouTube Data API v3, usada pra pesquisar música em{" "}
        <span className="font-medium text-gray-700">Música</span> (estilo Spotify). Veja o passo a passo em{" "}
        <span className="font-medium text-gray-700">Suporte → Tutoriais</span>.
      </p>

      {apiKey && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={12} className="mr-1" /> Configurada
            </Badge>
            <span className="font-mono text-xs text-gray-500">{maskApiKey(apiKey)}</span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleRemove} isLoading={isRemoving}>
            Remover
          </Button>
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="apiKey">{apiKey ? "Trocar chave" : "Chave da API"}</Label>
          <Input id="apiKey" name="apiKey" placeholder="AIza..." required />
        </div>
        <Button type="submit" isLoading={isPending}>
          Salvar
        </Button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
