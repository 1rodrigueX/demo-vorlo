"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Botão "Imprimir" — dispara window.print() por padrão (o print.css cuida de mostrar só o #erp-print-area). */
export function PrintButton({ label = "Imprimir", onPrint }: { label?: string; onPrint?: () => void }) {
  return (
    <Button type="button" variant="secondary" onClick={onPrint ?? (() => window.print())}>
      <Printer size={16} />
      {label}
    </Button>
  );
}
