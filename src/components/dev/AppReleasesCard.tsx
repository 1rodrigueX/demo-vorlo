"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MonitorDown, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { publishRelease, unpublishRelease, type ReleaseActionState } from "@/lib/actions/app-releases";

export type ReleaseItem = {
  id: string;
  version: string;
  url: string;
  notes: string | null;
  is_published: boolean;
  published_at: string | null;
};

export function AppReleasesCard({ releases }: { releases: ReleaseItem[] }) {
  const [state, formAction, isPending] = useActionState<ReleaseActionState, FormData>(publishRelease, null);
  const [busy, startBusy] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Versão publicada — o app já enxerga");
      formRef.current?.reset();
      router.refresh();
    }
    wasPending.current = isPending;
  }, [isPending, state, router]);

  function handleUnpublish(id: string) {
    startBusy(async () => {
      const result = await unpublishRelease(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const published = releases.find((r) => r.is_published);

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <MonitorDown size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">Versão do app (.exe)</h2>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        O app desktop consulta essa versão na aba Atualizações e se atualiza sozinho. Publique depois de rodar{" "}
        <code className="rounded bg-gray-100 px-1">npm run build</code> em <code>apps/synexa-desktop</code> e
        subir o instalador para o servidor.
      </p>

      {published && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2">
          <span className="text-sm text-emerald-800">
            No ar: <strong>v{published.version}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={() => handleUnpublish(published.id)} disabled={busy}>
            <EyeOff size={14} />
            Tirar do ar
          </Button>
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <div>
            <Label htmlFor="version">Versão</Label>
            <Input id="version" name="version" placeholder="0.2.0" required />
          </div>
          <div>
            <Label htmlFor="url">URL do instalador</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://falaai.cloud/downloads/Synexa_0.2.0_x64-setup.exe"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="signature">Assinatura (conteúdo do arquivo .sig)</Label>
          <Textarea id="signature" name="signature" rows={3} required placeholder="dW50cnVzdGVkIGNvbW1lbnQ6..." />
          <p className="mt-1 text-xs text-gray-400">
            Fica junto do instalador em <code>src-tauri/target/release/bundle/nsis/</code>. Sem ela o app
            recusa a atualização — é o que impede alguém de servir um instalador falso.
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Novidades (opcional)</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="O que mudou nesta versão" />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" isLoading={isPending}>
          Publicar versão
        </Button>
      </form>

      {releases.length > 1 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-medium text-gray-500">Histórico</p>
          <ul className="space-y-1">
            {releases
              .filter((r) => !r.is_published)
              .map((release) => (
                <li key={release.id} className="text-xs text-gray-500">
                  v{release.version}
                  {release.published_at && ` · ${new Date(release.published_at).toLocaleDateString("pt-BR")}`}
                </li>
              ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
