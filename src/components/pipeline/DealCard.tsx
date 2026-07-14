"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { DealWithContact } from "@/types/domain";

export function DealCard({ deal }: { deal: DealWithContact }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab space-y-1.5 rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-sm font-medium text-gray-900">{deal.title}</p>
      <p className="text-sm font-semibold text-indigo-600">{formatCurrency(Number(deal.value))}</p>
      {deal.contact && (
        <Link
          href={`/contacts/${deal.contact.id}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="block truncate text-xs text-gray-500 hover:text-indigo-600 hover:underline"
        >
          {deal.contact.name}
        </Link>
      )}
    </div>
  );
}
