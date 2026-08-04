import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

/** Cor do número grande. Sem neon: contadores em neutro; cor só pro que é
 * semântico — verde (positivo), vermelho (negativo), laranja da marca (destaque),
 * âmbar (atenção). "cyan" mantido no map por compatibilidade, mas neutro. */
const ACCENTS = {
  default: "text-gray-900",
  cyan: "text-gray-900",
  green: "text-emerald-500",
  violet: "text-indigo-500",
  amber: "text-amber-500",
  red: "text-red-500",
} as const;

export type StatAccent = keyof typeof ACCENTS;

export function StatTile({
  label,
  value,
  sub,
  accent = "default",
  footer,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: StatAccent;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", ACCENTS[accent])}>
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </Card>
  );
}
