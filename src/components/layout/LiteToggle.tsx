"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Alterna o Modo Lite (data-lite="1" no <html>) — tira os efeitos visuais que
 * mais pesam (blur, sombras, glows, fundos, animações) pra deixar o app/CRM
 * mais leve. Persistido em localStorage; aplicado antes do paint pelo
 * bootScript no layout raiz, então recarrega sem flash. */
export function LiteToggle({ className }: { className?: string }) {
  const [lite, setLite] = useState(false);

  useEffect(() => {
    // Sincroniza com o atributo que o bootScript já aplicou antes do paint
    // (não dá pra ler no render por causa do SSR — o servidor não sabe do lite).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLite(document.documentElement.getAttribute("data-lite") === "1");
  }, []);

  const toggle = () => {
    const next = !lite;
    setLite(next);
    document.documentElement.setAttribute("data-lite", next ? "1" : "0");
    try {
      localStorage.setItem("lite", next ? "1" : "0");
    } catch {
      /* localStorage indisponível — só mantém em memória nesta sessão */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={lite}
      aria-label={lite ? "Desativar Modo Lite" : "Ativar Modo Lite"}
      title={lite ? "Modo Lite ativo (mais leve)" : "Ativar Modo Lite (mais leve)"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
        lite
          ? "border-[#ff5722]/40 bg-[#ff5722]/10 text-[#ff5722]"
          : "border-gray-200 bg-panel text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        className,
      )}
    >
      <Zap size={18} strokeWidth={lite ? 2.4 : 2} />
    </button>
  );
}
