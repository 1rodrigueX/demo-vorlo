"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Divide a área em duas colunas com uma borda arrastável no meio — o painel
 * de largura fixa (`panel`) fica de um lado, `children` ocupa o resto. O
 * tamanho escolhido é lembrado por `storageKey` (localStorage), então cada
 * pessoa ajusta uma vez e fica do jeito dela.
 */
export function ResizableSplit({
  storageKey,
  defaultWidth,
  minWidth = 200,
  maxWidth = 480,
  side,
  panel,
  children,
}: {
  storageKey: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  side: "left" | "right";
  panel: ReactNode;
  children: ReactNode;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const widthRef = useRef(defaultWidth);

  useEffect(() => {
    const saved = Number(localStorage.getItem(storageKey));
    if (saved) {
      const clamped = Math.min(maxWidth, Math.max(minWidth, saved));
      widthRef.current = clamped;
      setWidth(clamped);
    }
  }, [storageKey, minWidth, maxWidth]);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    function onMove(ev: MouseEvent) {
      const delta = side === "left" ? ev.clientX - startX : startX - ev.clientX;
      const next = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
      widthRef.current = next;
      setWidth(next);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      localStorage.setItem(storageKey, String(widthRef.current));
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const panelEl = (
    <div style={{ width }} className="h-full shrink-0 overflow-hidden">
      {panel}
    </div>
  );

  const divider = (
    <div
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      className="group relative z-10 w-2 shrink-0 cursor-col-resize select-none"
    >
      <div
        className={cn(
          "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-200 transition-colors",
          "group-hover:w-0.5 group-hover:bg-indigo-400",
        )}
      />
    </div>
  );

  return (
    <div className="flex h-full w-full">
      {side === "left" && panelEl}
      {side === "left" && divider}
      <div className="h-full min-w-0 flex-1 overflow-hidden">{children}</div>
      {side === "right" && divider}
      {side === "right" && panelEl}
    </div>
  );
}
