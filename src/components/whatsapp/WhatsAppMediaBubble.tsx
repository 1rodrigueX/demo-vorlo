"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";

export function WhatsAppMediaBubble({
  messageId,
  contentType,
  fileName,
}: {
  messageId: string;
  contentType: string | null;
  fileName: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/whatsapp/media/${messageId}`)
      .then((res) => res.json())
      .then((data: { url?: string }) => {
        if (!cancelled && data.url) setUrl(data.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  if (!url) {
    return <div className="h-24 w-40 animate-pulse rounded-md bg-gray-100" />;
  }

  if (contentType?.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={fileName ?? "imagem"} className="max-h-64 max-w-full rounded-md object-contain" />;
  }

  if (contentType?.startsWith("audio/")) {
    return <audio controls src={url} className="max-w-full" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
    >
      <FileText size={16} className="shrink-0" />
      <span className="truncate">{fileName ?? "arquivo"}</span>
      <Download size={14} className="shrink-0 text-gray-400" />
    </a>
  );
}
