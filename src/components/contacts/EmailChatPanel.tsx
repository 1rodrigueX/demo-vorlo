"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Mail, AlertCircle, Paperclip, X } from "lucide-react";
import { onRealtime } from "@/lib/realtime/client";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/dates";
import { EmailAttachmentChip } from "@/components/email/EmailAttachmentChip";
import { RichTextEditor } from "@/components/email/RichTextEditor";
import type { EmailMessage } from "@/types/domain";

function sortEmails(list: EmailMessage[]): EmailMessage[] {
  return [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Une o servidor (que ganha nos ids repetidos) com os envios otimistas locais ainda não persistidos. */
function mergeEmails(local: EmailMessage[], server: EmailMessage[]): EmailMessage[] {
  const byId = new Map(local.map((m) => [m.id, m]));
  for (const m of server) byId.set(m.id, m);
  return sortEmails([...byId.values()]);
}

export function EmailChatPanel({
  contactId,
  initialMessages,
  hasEmail,
  showHeader = true,
  fillHeight = false,
}: {
  contactId: string;
  initialMessages: EmailMessage[];
  hasEmail: boolean;
  /** Esconde o cabeçalho interno "E-mail" — útil quando o container pai já mostra o nome do contato. */
  showHeader?: boolean;
  /** Preenche a altura do container pai (flex-1 h-full) em vez da altura fixa padrão. */
  fillHeight?: boolean;
}) {
  const router = useRouter();
  // Só os envios otimistas ficam em estado; o resto vem do servidor (props). A
  // lista é a fusão dos dois (servidor ganha nos ids repetidos; o id é gerado
  // no envio e gravado igual, então não duplica).
  const [optimistic, setOptimistic] = useState<EmailMessage[]>([]);
  const messages = useMemo(() => mergeEmails(optimistic, initialMessages), [optimistic, initialMessages]);
  const lastSubject = [...messages].reverse().find((m) => m.subject)?.subject ?? "";
  const [subject, setSubject] = useState(lastSubject ? `Re: ${lastSubject.replace(/^Re:\s*/i, "")}` : "");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Tempo real via SSE (antes era o Realtime do Supabase): ao chegar sinal de
  // e-mail deste contato (novo inbound do sync, envio de outro atendente),
  // recarrega do servidor.
  useEffect(() => {
    return onRealtime((event) => {
      if (event.table === "email_messages" && event.contactId === contactId) {
        router.refresh();
      }
    });
  }, [contactId, router]);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length) setFiles((prev) => [...prev, ...selected]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const isBodyEmpty = !body.replace(/<[^>]*>/g, "").trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBodyEmpty || !subject.trim()) return;

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("contactId", contactId);
      formData.set("subject", subject.trim());
      formData.set("message", body);
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/email/send", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao enviar e-mail");
        return;
      }

      const sent = data.message as EmailMessage;
      setOptimistic((prev) => [...prev, sent]);
      router.refresh();
      setBody("");
      setFiles([]);
    } catch {
      toast.error("Falha ao enviar e-mail");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50",
        fillHeight ? "h-full" : "h-[600px]",
      )}
    >
      {showHeader && (
        <div className="border-b border-gray-200 bg-panel px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">E-mail</h2>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!messages.length ? (
          <p className="mt-8 text-center text-sm text-gray-500">
            Nenhum e-mail ainda. Escreva a primeira mensagem abaixo.
          </p>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            const attachments = (msg.attachments as { fileName: string }[] | null) ?? [];
            return (
              <div key={msg.id} className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg border bg-panel px-3 py-2 shadow-sm",
                    isOutbound ? "border-indigo-200" : "border-gray-200",
                  )}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] text-gray-400">
                    <span className="truncate">{isOutbound ? `Para: ${msg.to_address}` : `De: ${msg.from_address}`}</span>
                    <span className="shrink-0">{formatDateTime(msg.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{msg.subject || "(sem assunto)"}</p>
                  {msg.body_html ? (
                    <div
                      className="mt-1 max-w-none break-words text-sm text-gray-700 [&_a]:text-indigo-600 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                      // body_html já é sanitizado antes de ser gravado (compose e sync) —
                      // nunca gravamos HTML de origem não confiável sem passar por sanitizeEmailHtml.
                      dangerouslySetInnerHTML={{ __html: msg.body_html }}
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{msg.body}</p>
                  )}
                  {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {attachments.map((att, i) => (
                        <EmailAttachmentChip key={i} messageId={msg.id} index={i} fileName={att.fileName} />
                      ))}
                    </div>
                  )}
                  {msg.status === "failed" && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={12} /> {msg.error_message || "Falha no envio"}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-panel p-3">
        {!hasEmail ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Adicione um e-mail ao contato para enviar mensagens.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto"
              className="w-full rounded-lg border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((file, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                  >
                    <Paperclip size={11} />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeFile(i)} aria-label={`Remover ${file.name}`}>
                      <X size={12} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-start gap-2">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
                aria-label="Anexar arquivo"
              >
                <Paperclip size={18} />
              </button>
              <div className="flex-1">
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  placeholder="Escreva o e-mail..."
                  minHeightClassName="min-h-[64px]"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || isBodyEmpty || !subject.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:bg-indigo-300"
                aria-label="Enviar e-mail"
              >
                {isPending ? <Mail size={16} className="animate-pulse" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
