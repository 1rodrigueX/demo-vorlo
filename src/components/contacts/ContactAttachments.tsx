"use client";

import { useActionState, useEffect, useRef } from "react";
import { FileText, Upload } from "lucide-react";
import { uploadContactAttachment, deleteContactAttachment, type ActionState } from "@/lib/actions/attachments";
import { Button } from "@/components/ui/Button";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";

type AttachmentView = {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  createdAt: string;
  url: string | null;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContactAttachments({
  contactId,
  attachments,
}: {
  contactId: string;
  attachments: AttachmentView[];
}) {
  const action = uploadContactAttachment.bind(null, contactId);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Anexos (proposta em PDF)</h2>

      {!attachments.length ? (
        <p className="mb-3 text-sm text-gray-500">Nenhum PDF anexado ainda.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border border-gray-100 px-3 py-2"
            >
              <a
                href={a.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm text-gray-900 hover:underline"
              >
                <FileText size={14} className="shrink-0 text-gray-400" />
                <span className="truncate">{a.fileName}</span>
                {a.sizeBytes ? (
                  <span className="shrink-0 text-xs text-gray-400">({formatSize(a.sizeBytes)})</span>
                ) : null}
              </a>
              <ConfirmDeleteButton
                action={deleteContactAttachment.bind(null, a.id)}
                confirmMessage={`Excluir o anexo "${a.fileName}"?`}
                label=""
              />
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="flex-1 text-sm text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
        <Button type="submit" size="sm" isLoading={isPending}>
          <Upload size={14} />
          Anexar
        </Button>
      </form>
      {state?.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
