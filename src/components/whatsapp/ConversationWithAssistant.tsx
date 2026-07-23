"use client";

import type { ReactNode } from "react";
import { ResizableSplit } from "@/components/ui/ResizableSplit";

/** Divide a conversa (flexível) e o painel do Synexa (arrastável) — a página em si é Server Component. */
export function ConversationWithAssistant({
  assistant,
  children,
}: {
  assistant: ReactNode | null;
  children: ReactNode;
}) {
  if (!assistant) return <>{children}</>;

  return (
    <ResizableSplit storageKey="whatsapp-assistant-width" defaultWidth={272} minWidth={260} maxWidth={480} side="right" panel={assistant}>
      {children}
    </ResizableSplit>
  );
}
