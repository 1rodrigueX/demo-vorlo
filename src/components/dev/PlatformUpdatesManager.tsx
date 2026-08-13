"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Trash2, Mail, Users, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  saveUpdate,
  deleteUpdate,
  sendUpdate,
  sendTestUpdate,
  countRecipients,
  generatePlatformUpdate,
  type UpdateActionState,
} from "@/lib/actions/platform-updates";

export type UpdateItem = {
  id: string;
  title: string;
  version: string | null;
  body: string;
  status: "draft" | "sending" | "sent" | "failed";
  recipients_total: number;
  recipients_sent: number;
  recipients_failed: number;
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

export function PlatformUpdatesManager({
  updates,
  devEmail,
}: {
  updates: UpdateItem[];
  devEmail: string;
}) {
  const [state, formAction, isPending] = useActionState<UpdateActionState, FormData>(saveUpdate, null);
  const [recipients, setRecipients] = useState<number | null>(null);
  const [busy, startBusy] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  // Campos controlados pra a IA conseguir preenchê-los.
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // "Escrever com IA".
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, startAi] = useTransition();

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Comunicado salvo como rascunho");
      setTitle("");
      setVersion("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
      router.refresh();
    }
    wasPending.current = isPending;
  }, [isPending, state, router]);

  function handleGenerate() {
    startAi(async () => {
      const result = await generatePlatformUpdate(aiInstruction);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setTitle(result.update.title);
      setVersion(result.update.version ?? "");
      setBody(result.update.body);
      setCtaLabel(result.update.ctaLabel ?? "");
      setCtaUrl(result.update.ctaUrl ?? "");
      toast.success("Comunicado escrito pela IA — revise e ajuste antes de enviar");
    });
  }

  function handleCount() {
    startBusy(async () => {
      const result = await countRecipients();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRecipients(result.total);
    });
  }

  function handleTest(id: string) {
    startBusy(async () => {
      const result = await sendTestUpdate(id, devEmail);
      if (result?.error) toast.error(result.error);
      else toast.success(`Teste enviado para ${devEmail}`);
    });
  }

  function handleSend(update: UpdateItem) {
    const total = recipients ?? 0;
    const confirmation = total
      ? `Enviar "${update.title}" para ${total} cadastrados? Não dá pra voltar atrás.`
      : `Enviar "${update.title}" para TODOS os cadastrados? Não dá pra voltar atrás.`;
    if (!confirm(confirmation)) return;

    startBusy(async () => {
      const result = await sendUpdate(update.id);
      if (result.error) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      toast.success(`Enviado para ${result.sent} destinatários`);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Apagar este rascunho?")) return;
    startBusy(async () => {
      const result = await deleteUpdate(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Atualizações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comunicado por e-mail para todo mundo que tem cadastro na Vorlo — inclusive quem nunca acessou.
          Sempre com link de descadastro, que é obrigatório em envio em massa.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Novo comunicado</h2>

        <div className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">Escrever com IA</span>
          </div>
          <p className="mb-3 text-xs text-indigo-700/80">
            Diga em uma frase o que foi lançado — a IA escreve o comunicado inteiro na voz da Vorlo. Você revisa antes de enviar.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="Ex: chat de WhatsApp com áudio e imagem no aplicativo"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <Button type="button" onClick={handleGenerate} isLoading={aiBusy} className="shrink-0">
              <Sparkles size={15} />
              Escrever
            </Button>
          </div>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Trajetórias agora rodam sozinhas"
                required
              />
            </div>
            <div>
              <Label htmlFor="version">Versão (opcional)</Label>
              <Input
                id="version"
                name="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v2.4"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="body">Conteúdo</Label>
            <Textarea
              id="body"
              name="body"
              rows={8}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Conte a novidade em poucas linhas.\n\nDeixe uma linha em branco para separar parágrafos."}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ctaLabel">Texto do botão (opcional)</Label>
              <Input
                id="ctaLabel"
                name="ctaLabel"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Ver o que mudou"
              />
            </div>
            <div>
              <Label htmlFor="ctaUrl">Link do botão</Label>
              <Input
                id="ctaUrl"
                name="ctaUrl"
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" isLoading={isPending}>
              Salvar rascunho
            </Button>
            <Button type="button" variant="secondary" onClick={handleCount} isLoading={busy}>
              <Users size={15} />
              {recipients === null ? "Contar destinatários" : `${recipients} destinatários`}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {updates.length === 0 ? (
          <Card className="p-8 text-center text-sm text-gray-500">Nenhum comunicado ainda.</Card>
        ) : (
          updates.map((update) => (
            <Card key={update.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{update.title}</h3>
                    {update.version && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {update.version}
                      </span>
                    )}
                    <StatusPill update={update} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-sm text-gray-500">{update.body}</p>
                  {update.error && <p className="mt-1.5 text-xs text-red-600">{update.error}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleTest(update.id)} disabled={busy}>
                    <Mail size={14} />
                    Testar
                  </Button>
                  {update.status === "draft" && (
                    <>
                      <Button size="sm" onClick={() => handleSend(update)} disabled={busy}>
                        <Send size={14} />
                        Enviar
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDelete(update.id)}
                        disabled={busy}
                        className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600"
                        aria-label="Apagar rascunho"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function StatusPill({ update }: { update: UpdateItem }) {
  if (update.status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 size={11} />
        Enviado para {update.recipients_sent}
        {update.recipients_failed > 0 ? ` · ${update.recipients_failed} falharam` : ""}
      </span>
    );
  }
  if (update.status === "sending") {
    return (
      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
        Enviando {update.recipients_sent}/{update.recipients_total}
      </span>
    );
  }
  if (update.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
        <AlertCircle size={11} />
        Falhou
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Rascunho</span>
  );
}
