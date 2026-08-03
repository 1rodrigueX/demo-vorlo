"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CheckCheck, Clock, AlertCircle, Send, Paperclip, Mic, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatTime, formatDayDivider, isSameCalendarDay } from "@/lib/utils/dates";
import { WhatsAppMediaBubble } from "@/components/whatsapp/WhatsAppMediaBubble";
import type { WhatsAppMessage } from "@/types/domain";

const statusIcon: Record<string, React.ReactNode> = {
  queued: <Clock size={13} />,
  sending: <Clock size={13} />,
  sent: <Check size={13} />,
  delivered: <CheckCheck size={13} />,
  read: <CheckCheck size={13} className="text-sky-500" />,
  undelivered: <AlertCircle size={13} className="text-red-500" />,
  failed: <AlertCircle size={13} className="text-red-500" />,
};

export function WhatsAppChatPanel({
  contactId,
  initialMessages,
  hasPhone,
  showHeader = true,
  fillHeight = false,
}: {
  contactId: string;
  initialMessages: WhatsAppMessage[];
  hasPhone: boolean;
  /** Esconde o cabeçalho interno "WhatsApp" — útil quando o container pai já mostra o nome do contato. */
  showHeader?: boolean;
  /** Preenche a altura do container pai (flex-1 h-full) em vez da altura fixa padrão. */
  fillHeight?: boolean;
}) {
  const [messages, setMessages] = useState(
    [...initialMessages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  );
  const [text, setText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`whatsapp-chat-${contactId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const incoming = payload.new as WhatsAppMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const updated = payload.new as WhatsAppMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId]);

  async function sendFormData(formData: FormData) {
    setIsPending(true);
    try {
      const res = await fetch("/api/whatsapp/send", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao enviar mensagem");
        return;
      }

      const sent = data.message as WhatsAppMessage;
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch {
      toast.error("Falha ao enviar mensagem");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;

    setText("");
    const formData = new FormData();
    formData.set("contactId", contactId);
    formData.set("message", message);
    await sendFormData(formData);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.set("contactId", contactId);
    formData.set("message", text.trim());
    formData.set("file", file);
    setText("");
    await sendFormData(formData);
  }

  async function handleToggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    // getUserMedia só existe em contexto seguro (HTTPS ou localhost) — sem
    // isso o navigator.mediaDevices inteiro vem undefined, e chamar
    // .getUserMedia nele lançava um TypeError genérico que caía no mesmo
    // catch-all de baixo, escondendo a causa real (acesso via IP/HTTP em
    // vez do domínio com HTTPS, por exemplo).
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Gravação de áudio não disponível — acesse pelo endereço https:// do site");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        if (!blob.size) return;

        const formData = new FormData();
        formData.set("contactId", contactId);
        formData.set("message", "");
        formData.set("audio", blob, "recording.webm");
        await sendFormData(formData);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast.error("Permissão do microfone negada — libere o acesso nas configurações do navegador");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("Nenhum microfone encontrado nesse dispositivo");
      } else if (name === "NotReadableError") {
        toast.error("O microfone está sendo usado por outro programa");
      } else {
        toast.error("Não foi possível acessar o microfone");
      }
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-panel",
        fillHeight ? "h-full" : "h-[600px]",
      )}
    >
      {showHeader && (
        <div className="border-b border-gray-200 bg-panel px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">WhatsApp</h2>
        </div>
      )}

      <div className="synexa-chat-bg flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        {!messages.length ? (
          <p className="mt-8 text-center text-sm text-gray-500">
            Nenhuma mensagem ainda. Envie a primeira abaixo.
          </p>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showDivider = !prev || !isSameCalendarDay(prev.created_at, msg.created_at);
            const isOutbound = msg.direction === "outbound";

            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full border border-gray-200 bg-panel/90 px-3 py-1 text-xs font-medium text-gray-500 shadow-sm backdrop-blur">
                      {formatDayDivider(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "chat-bubble max-w-[78%] px-3.5 py-2 text-sm shadow-sm",
                      isOutbound
                        ? "rounded-2xl rounded-br-md text-white shadow-indigo-500/20"
                        : "rounded-2xl rounded-bl-md border border-gray-200 bg-panel text-gray-900",
                    )}
                    style={isOutbound ? { background: "linear-gradient(135deg, #ff7a4d, #ff5722)" } : undefined}
                  >
                    {msg.media_storage_path && (
                      <div className="mb-1">
                        <WhatsAppMediaBubble
                          messageId={msg.id}
                          contentType={msg.media_content_type}
                          fileName={msg.media_file_name}
                        />
                      </div>
                    )}
                    {msg.body && <p className="whitespace-pre-wrap break-words text-sm">{msg.body}</p>}
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1 text-[11px]",
                        isOutbound ? "justify-end text-white/70" : "justify-start text-gray-400",
                      )}
                    >
                      <span>{formatTime(msg.created_at)}</span>
                      {isOutbound && (statusIcon[msg.status] ?? null)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-panel p-3">
        {!hasPhone ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Adicione um telefone (formato internacional) ao contato para enviar WhatsApp.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelected}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending || isRecording}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
              aria-label="Anexar arquivo"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Escreva uma mensagem..."
              rows={1}
              className="max-h-32 flex-1 resize-none rounded-2xl border border-gray-300 bg-panel px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={isPending}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                isRecording ? "bg-red-500 text-white hover:bg-red-400" : "text-gray-500 hover:bg-gray-100",
              )}
              aria-label={isRecording ? "Parar gravação" : "Gravar áudio"}
            >
              {isRecording ? <Square size={16} /> : <Mic size={18} />}
            </button>
            <button
              type="submit"
              disabled={isPending || !text.trim()}
              style={{ background: "linear-gradient(135deg, #ff7a4d, #ff5722)" }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
