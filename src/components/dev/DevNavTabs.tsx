"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/dev", label: "Empresas" },
  { href: "/dev/seguranca", label: "Segurança" },
  { href: "/dev/atualizacoes", label: "Atualizações" },
  { href: "/dev/videos", label: "Vídeos" },
  { href: "/dev/sugestoes", label: "Sugestões" },
  { href: "/dev/feedback", label: "Feedback" },
  { href: "/dev/bugs", label: "Bugs" },
  { href: "/dev/discord", label: "Discord" },
];

export function DevNavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
