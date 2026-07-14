"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AssistantChatPanel() {
  const [open, setOpen] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loadedHistory) return;
    fetch("/api/assistant/chat")
      .then((res) => res.json())
      .then((data: { messages?: ChatMessage[] }) => {
        setMessages(data.messages ?? []);
        setLoadedHistory(true);
      })
      .catch(() => setLoadedHistory(true));
  }, [open, loadedHistory]);

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
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Não foi possível falar com o assistente");
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } catch {
        setError("Falha de conexão com o assistente");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 hover:bg-indigo-500"
        aria-label="Assistente de IA"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[520px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-indigo-600 px-4 py-3 text-white">
            <Sparkles size={16} />
            <div>
              <p className="text-sm font-semibold leading-tight">Assistente de vendas</p>
              <p className="text-[11px] text-indigo-100">Orçamentos, propostas e dúvidas</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {!loadedHistory && <p className="text-center text-xs text-gray-400">Carregando...</p>}
            {loadedHistory && messages.length === 0 && (
              <p className="mt-6 text-center text-sm text-gray-400">
                Pergunte algo como &quot;qual valor sugerir pro João?&quot; ou &quot;marca a proposta do
                contato Maria como enviada&quot;.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-800",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-400">
                  digitando...
                </div>
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
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={isPending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:bg-indigo-300"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
