"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Paperclip, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function NewEmailButton() {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  function reset() {
    setTo("");
    setCc("");
    setShowCc(false);
    setSubject("");
    setBody("");
    setFiles([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) return;

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("to", to.trim());
      if (cc.trim()) formData.set("cc", cc.trim());
      formData.set("subject", subject.trim());
      formData.set("message", body.trim());
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/email/send", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao enviar e-mail");
        return;
      }

      toast.success("E-mail enviado");
      setOpen(false);
      const sentContactId = data.message?.contact_id as string | undefined;
      reset();
      if (sentContactId) router.push(`/emails/${sentContactId}`);
      router.refresh();
    } catch {
      toast.error("Falha ao enviar e-mail");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Plus size={14} />
        Novo e-mail
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo e-mail">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="new-email-to">Para</Label>
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Adicionar Cc
                </button>
              )}
            </div>
            <Input
              id="new-email-to"
              type="email"
              placeholder="destinatario@exemplo.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          {showCc && (
            <div>
              <Label htmlFor="new-email-cc">Cc</Label>
              <Input
                id="new-email-cc"
                placeholder="fulano@exemplo.com, ciclano@exemplo.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="new-email-subject">Assunto</Label>
            <Input id="new-email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="new-email-body">Mensagem</Label>
            <textarea
              id="new-email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              required
              className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {files.map((file, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                >
                  <Paperclip size={11} />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remover ${file.name}`}
                  >
                    <X size={12} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline">
              <Paperclip size={13} />
              Anexar arquivo
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (selected.length) setFiles((prev) => [...prev, ...selected]);
                }}
              />
            </label>
          </div>

          <Button type="submit" className="w-full" isLoading={isPending}>
            Enviar
          </Button>
        </form>
      </Modal>
    </>
  );
}
