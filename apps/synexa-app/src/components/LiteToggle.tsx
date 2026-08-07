import { Zap } from "lucide-react";
import { useLite, setLite } from "@/lib/lite";

/**
 * Alterna o Modo Lite (data-lite no <html>) — mais leve pra máquinas fracas:
 * o CSS corta sombra, blur, filtros e animações. Estado vem do store reativo
 * (lib/lite), então liga/desliga na hora em toda a UI. Persiste em
 * localStorage e é aplicado antes do paint pelo script inline no index.html.
 */
export function LiteToggle() {
  const lite = useLite();

  return (
    <button
      type="button"
      onClick={() => setLite(!lite)}
      title={lite ? "Modo Lite ativo (mais leve)" : "Ativar Modo Lite (mais leve)"}
      aria-pressed={lite}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 transition-colors ${
        lite
          ? "border-ignite/40 bg-ignite/10 text-ignite"
          : "border-carbon-700 text-grey hover:bg-carbon-800 hover:text-white-soft"
      }`}
    >
      <Zap size={16} strokeWidth={lite ? 2.4 : 2} />
      <span className="text-xs font-medium">Lite</span>
    </button>
  );
}
