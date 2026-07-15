"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ConversationList } from "@/components/email/ConversationList";
import { NewEmailButton } from "@/components/email/NewEmailButton";
import type { EmailConversation } from "@/lib/email/getConversations";

export function EmailInboxShell({
  conversations,
  children,
}: {
  conversations: EmailConversation[];
  children: ReactNode;
}) {
  const [isSyncing, startSync] = useTransition();
  const router = useRouter();

  function handleSync() {
    startSync(async () => {
      try {
        const res = await fetch("/api/email/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Falha ao sincronizar");
          return;
        }
        if (data.synced > 0) {
          toast.success(`${data.synced} e-mail(s) novo(s)`);
        }
        router.refresh();
      } catch {
        toast.error("Falha ao sincronizar");
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem-3rem)] overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
      <div className="flex w-80 shrink-0 flex-col border-r border-gray-200">
        <NewEmailButton />
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Sincronizando..." : "Sincronizar e-mails"}
        </button>
        <div className="min-h-0 flex-1">
          <ConversationList conversations={conversations} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
