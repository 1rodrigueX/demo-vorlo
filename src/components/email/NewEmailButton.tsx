"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Paperclip, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

type ContactOption = { id: string; name: string; email: string | null };

export function NewEmailButton({ contacts }: { contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const emailableContacts = contacts.filter((c) => c.email);

  function reset() {
    setContactId("");
    setSubject("");
    setBody("");
    setFiles([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !subject.trim() || !body.trim()) return;

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("contactId", contactId);
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
      const sentContactId = contactId;
      reset();
      router.push(`/emails/${sentContactId}`);
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
            <Label htmlFor="new-email-contact">Para</Label>
            <Select
              id="new-email-contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecione um contato
              </option>
              {emailableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </Select>
            {!emailableContacts.length && (
              <p className="mt-1 text-xs text-amber-600">
                Nenhum contato com e-mail cadastrado ainda.
              </p>
            )}
          </div>

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

          <Button type="submit" className="w-full" isLoading={isPending} disabled={!emailableContacts.length}>
            Enviar
          </Button>
        </form>
      </Modal>
    </>
  );
}
