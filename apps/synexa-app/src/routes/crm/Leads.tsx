import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, Paperclip, Mic, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { apiPostForm } from "@/lib/api";

type Msg = {
  id: string;
  contact_id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  created_at: string;
  contact: { name: string; phone: string | null } | null;
};
type Convo = { contactId: string; name: string; phone: string | null; last: Msg };

export function Leads() {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("id, contact_id, direction, body, created_at, contact:contacts(name, phone)")
        .order("created_at", { ascending: false })
        .limit(400);
      if (alive) setMsgs((data ?? []) as unknown as Msg[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const convos = useMemo<Convo[] | null>(() => {
    if (!msgs) return null;
    const seen = new Map<string, Convo>();
    for (const m of msgs) {
      // msgs vêm em ordem decrescente → a 1ª de cada contato é a mais recente.
      if (!seen.has(m.contact_id)) {
        seen.set(m.contact_id, {
          contactId: m.contact_id,
          name: m.contact?.name || "Sem nome",
          phone: m.contact?.phone ?? null,
          last: m,
        });
      }
    }
    return [...seen.values()];
  }, [msgs]);

  useEffect(() => {
    if (convos && convos.length && !selected) setSelected(convos[0].contactId);
  }, [convos, selected]);

  const thread = useMemo(() => {
    if (!msgs || !selected) return [];
    return msgs.filter((m) => m.contact_id === selected).slice().reverse();
  }, [msgs, selected]);

  const current = convos?.find((c) => c.contactId === selected);

  const sendForm = async (form: FormData, optimisticBody: string) => {
    if (!current || sending) return;
    form.set("contactId", current.contactId);
    setSending(true);
    try {
      await apiPostForm("/api/public/whatsapp-send", form);
      const optimistic: Msg = {
        id: `tmp-${Date.now()}`,
        contact_id: current.contactId,
        direction: "outbound",
        body: optimisticBody,
        created_at: new Date().toISOString(),
        contact: null,
      };
      setMsgs((prev) => (prev ? [optimistic, ...prev] : [optimistic]));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao enviar");
    } finally {
      setSending(false);
    }
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const form = new FormData();
    form.set("message", text);
    setDraft("");
    void sendForm(form, text);
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    void sendForm(form, `📎 ${file.name}`);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const form = new FormData();
        form.set("audio", blob, "audio.webm");
        void sendForm(form, "🎤 Áudio");
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRec = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-carbon-800">
        <div className="border-b border-carbon-800 px-4 py-3">
          <h1 className="text-sm font-semibold text-white-soft">Leads · WhatsApp</h1>
          <p className="text-xs text-grey-dim">{convos ? `${convos.length} conversas` : "carregando…"}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {convos === null ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-carbon-800" />
              ))}
            </div>
          ) : convos.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-grey">Nenhuma conversa.</p>
          ) : (
            convos.map((c) => (
              <button
                key={c.contactId}
                onClick={() => setSelected(c.contactId)}
                className={`flex w-full items-start gap-3 border-b border-carbon-800/60 px-4 py-3 text-left transition-colors ${
                  selected === c.contactId ? "bg-carbon-800" : "hover:bg-carbon-850"
                }`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-carbon-700 text-xs font-semibold text-white-soft">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white-soft">{c.name}</p>
                  <p className="truncate text-xs text-grey">{c.last.body || "(mídia)"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-carbon-800">
        {!current ? (
          <div className="grid h-full place-items-center text-grey">
            <div className="text-center">
              <MessageCircle size={28} className="mx-auto text-grey-dim" />
              <p className="mt-2 text-sm">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-carbon-800 px-5 py-3">
              <p className="text-sm font-semibold text-white-soft">{current.name}</p>
              {current.phone && <p className="text-xs text-grey-dim">{current.phone}</p>}
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {thread.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                      m.direction === "outbound" ? "bg-ignite/90 text-white" : "bg-carbon-800 text-white-soft"
                    }`}
                  >
                    {m.body || "(mídia)"}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-carbon-800 p-3">
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePicked} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || recording}
                title="Anexar arquivo"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-carbon-700 text-grey transition-colors hover:bg-carbon-800 hover:text-white-soft disabled:opacity-40"
              >
                <Paperclip size={17} />
              </button>
              <button
                type="button"
                onClick={recording ? stopRec : startRec}
                disabled={sending}
                title={recording ? "Parar e enviar áudio" : "Gravar áudio"}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                  recording
                    ? "animate-pulse border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-carbon-700 text-grey hover:bg-carbon-800 hover:text-white-soft"
                }`}
              >
                {recording ? <Square size={15} /> : <Mic size={17} />}
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={recording ? "Gravando áudio…" : "Responder…"}
                disabled={recording}
                className="flex-1 rounded-lg border border-carbon-700 bg-carbon-800 px-3.5 py-2.5 text-sm text-white-soft outline-none placeholder:text-grey-dim focus:border-ignite/60 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || recording || !draft.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ignite text-white transition-all hover:brightness-110 disabled:opacity-40"
                title="Enviar"
              >
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
