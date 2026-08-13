import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Estado vazio — usado no DataTable (sem resultados) e diretamente onde fizer sentido. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-panel px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-400"
          >
            {action.label}
          </Link>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
