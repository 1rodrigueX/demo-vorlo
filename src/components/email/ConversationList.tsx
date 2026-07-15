"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/dates";
import type { EmailConversation } from "@/lib/email/getConversations";

export function ConversationList({ conversations }: { conversations: EmailConversation[] }) {
  const pathname = usePathname();

  if (!conversations.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
        Nenhum e-mail ainda.
      </div>
    );
  }

  return (
    <ul className="h-full divide-y divide-gray-100 overflow-y-auto">
      {conversations.map(({ contact, lastMessage }) => {
        const href = `/emails/${contact.id}`;
        const isActive = pathname === href;
        const initials = contact.name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <li key={contact.id}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-gray-50",
                isActive && "bg-indigo-50",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                {initials || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatRelative(lastMessage.created_at)}
                  </span>
                </div>
                <p className="truncate text-xs font-medium text-gray-600">
                  {lastMessage.subject || "(sem assunto)"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {lastMessage.direction === "outbound" && "Você: "}
                  {lastMessage.body}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
