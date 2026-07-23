"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Painel de chat genérico com um agente de IA — usado tanto pelo botão flutuante do Synexa quanto embutido (fixo) numa tela específica, como a conversa de um lead no WhatsApp. */
export function AgentChatPanel({
  agentId,
  title,
  subtitle,
  emptyStateHint,
  position = "bottom-left",
  mode = "floating",
  contextHint,
}: {
  agentId: string;
  title: string;
  subtitle: string;
  emptyStateHint: string;
  position?: "bottom-left" | "bottom-right";
  /** "inline" renderiza sempre aberto, ocupando o espaço do container pai — sem bolha flutuante nem posição fixa. */
  mode?: "floating" | "inline";
  /** Contexto extra (ex: qual lead está aberto) somado ao prompt do agente nessa conversa — não fica salvo no histórico. */
  contextHint?: string;
}) {
  const isInline = mode === "inline";
  const [open, setOpen] = useState(isInline);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { brandColor } = useTenantTheme();
  const sideClass = position === "bottom-right" ? "right-5" : "left-5";

  useEffect(() => {
    if (!open || loadedHistory) return;
    fetch(`/api/agents/${agentId}/chat`)
      .then((res) => res.json())
      .then((data: { messages?: ChatMessage[] }) => {
        setMessages(data.messages ?? []);
        setLoadedHistory(true);
      })
      .catch(() => setLoadedHistory(true));
  }, [open, loadedHistory, agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, contextHint }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Não foi possível falar com o agente");
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.agentsChanged) router.refresh();
      } catch {
        setError("Falha de conexão com o agente");
      }
    });
  }

  const panel = (
    <div
      className={cn(
        "flex flex-col overflow-hidden border-gray-200 bg-panel",
        isInline
          ? "h-full w-full rounded-xl border"
          : cn(
              "fixed bottom-24 z-40 h-[520px] w-[380px] max-w-[calc(100vw-2.5rem)] rounded-xl border shadow-2xl",
              sideClass,
            ),
      )}
    >
      <div
        style={{ backgroundColor: brandColor }}
        className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-white"
      >
        <Sparkles size={16} />
        <div>
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="text-[11px] text-white/80">{subtitle}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!loadedHistory && <p className="text-center text-xs text-gray-400">Carregando...</p>}
        {loadedHistory && messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-400">{emptyStateHint}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              style={m.role === "user" ? { backgroundColor: brandColor } : undefined}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                m.role === "user" ? "text-white" : "bg-gray-100 text-gray-800",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-400">digitando...</div>
          </div>
        )}
        {error && <p className="text-center text-xs text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-gray-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Digite sua pergunta..."
          className="flex-1 rounded-lg border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={isPending || !input.trim()}
          style={{ backgroundColor: brandColor }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:brightness-110 disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  if (isInline) return panel;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ backgroundColor: brandColor }}
        className={cn(
          "fixed bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 hover:brightness-110",
          sideClass,
        )}
        aria-label={title}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && panel}
    </>
  );
}
