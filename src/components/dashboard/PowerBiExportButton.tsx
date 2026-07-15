"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, Copy, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { createApiKey, revokeApiKey, type CreateApiKeyState } from "@/lib/actions/api-keys";
import { formatDateTime } from "@/lib/utils/dates";
import type { TenantApiKey } from "@/types/domain";

function copyToClipboard(text: string, message: string) {
  navigator.clipboard.writeText(text);
  toast.success(message);
}

export function PowerBiExportButton({
  apiKeys,
  siteUrl,
}: {
  apiKeys: Pick<TenantApiKey, "id" | "name" | "key_prefix" | "created_at" | "last_used_at">[];
  siteUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<CreateApiKeyState, FormData>(createApiKey, null);
  const [isWorking, startWorking] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && state?.rawKey) {
      formRef.current?.reset();
      router.refresh();
    }
    wasPending.current = isPending;
  }, [isPending, state, router]);

  function handleRevoke(id: string) {
    startWorking(async () => {
      await revokeApiKey(id);
      router.refresh();
    });
  }

  const dealsUrl = `${siteUrl}/api/reports/deals`;
  const contactsUrl = `${siteUrl}/api/reports/contacts`;

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <BarChart3 size={14} />
        Exportar pro Power BI
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Exportar dados pro Power BI">
        <div className="space-y-5">
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-700">Como conectar no Power BI Desktop:</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>Gere uma chave abaixo e copie o valor (só aparece uma vez).</li>
              <li>
                No Power BI: <strong>Obter Dados &gt; Web</strong>, cole a URL do feed desejado.
              </li>
              <li>
                Em <strong>Configurações avançadas</strong>, adicione o cabeçalho{" "}
                <code className="rounded bg-gray-200 px-1 py-0.5">Authorization</code> com o valor{" "}
                <code className="rounded bg-gray-200 px-1 py-0.5">Bearer &lt;sua chave&gt;</code>.
              </li>
            </ol>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Input readOnly value={dealsUrl} className="bg-panel text-[11px] text-gray-600" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(dealsUrl, "URL de negócios copiada")}
                >
                  <Copy size={13} />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={contactsUrl} className="bg-panel text-[11px] text-gray-600" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(contactsUrl, "URL de contatos copiada")}
                >
                  <Copy size={13} />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold text-gray-500">Chaves de API</h3>
            {!apiKeys.length ? (
              <p className="text-sm text-gray-500">Nenhuma chave criada ainda.</p>
            ) : (
              <ul className="mb-3 space-y-1.5">
                {apiKeys.map((key) => (
                  <li
                    key={key.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{key.name}</p>
                      <p className="text-xs text-gray-500">
                        {key.key_prefix}••••••• · criada em {formatDateTime(key.created_at)}
                        {key.last_used_at ? ` · usada em ${formatDateTime(key.last_used_at)}` : " · nunca usada"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      disabled={isWorking}
                      className="shrink-0 text-gray-400 hover:text-red-600"
                      aria-label={`Revogar chave ${key.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {state?.rawKey ? (
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs font-medium text-emerald-700">
                  Copie agora — essa chave não vai aparecer de novo:
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input readOnly value={state.rawKey} className="bg-panel text-xs text-gray-700" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(state.rawKey!, "Chave copiada")}
                  >
                    <Copy size={13} />
                  </Button>
                </div>
              </div>
            ) : (
              <form ref={formRef} action={formAction} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="new-api-key-name">Nova chave</Label>
                  <Input id="new-api-key-name" name="name" placeholder="Ex: Power BI" required />
                </div>
                <Button type="submit" size="sm" isLoading={isPending}>
                  <KeyRound size={14} />
                  Gerar
                </Button>
              </form>
            )}
            {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
          </div>
        </div>
      </Modal>
    </>
  );
}
