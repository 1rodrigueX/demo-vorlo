import { useState } from "react";
import { Zap } from "lucide-react";

/** Alterna o Modo Lite (data-lite no <html>). Sem SSR aqui, então lê o DOM
 * direto no init. Persiste em localStorage; aplicado antes do paint pelo
 * script inline em index.html. */
export function LiteToggle() {
  const [lite, setLite] = useState(() => document.documentElement.getAttribute("data-lite") === "1");

  const toggle = () => {
    const next = !lite;
    setLite(next);
    document.documentElement.setAttribute("data-lite", next ? "1" : "0");
    try {
      localStorage.setItem("lite", next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={lite ? "Modo Lite ativo (mais leve)" : "Ativar Modo Lite (mais leve)"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
        lite
          ? "border-ignite/40 bg-ignite/10 text-ignite"
          : "border-carbon-700 text-grey hover:bg-carbon-800 hover:text-white-soft"
      }`}
    >
      <Zap size={16} strokeWidth={lite ? 2.4 : 2} />
    </button>
  );
}
