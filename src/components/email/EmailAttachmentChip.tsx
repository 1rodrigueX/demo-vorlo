"use client";

import { useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";

export function EmailAttachmentChip({
  messageId,
  index,
  fileName,
}: {
  messageId: string;
  index: number;
  fileName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/email/attachment/${messageId}?index=${index}`);
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-60"
    >
      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
      <span className="max-w-[140px] truncate">{fileName}</span>
    </button>
  );
}
