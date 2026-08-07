import { useSyncExternalStore } from "react";

/**
 * Estado do Modo Lite, compartilhado e reativo. Fonte única da verdade pro
 * atributo data-lite no <html> + localStorage — qualquer componente lê e reage
 * (não só o botão do cabeçalho).
 *
 * O atributo é aplicado ANTES do paint pelo script inline no index.html (sem
 * flash); aqui a gente só lê/atualiza e avisa os interessados.
 */

const KEY = "lite";
type Listener = () => void;
const listeners = new Set<Listener>();

export function isLite(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-lite") === "1";
}

export function setLite(next: boolean): void {
  document.documentElement.setAttribute("data-lite", next ? "1" : "0");
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* localStorage indisponível — segue só no atributo */
  }
  listeners.forEach((l) => l());
}

/** Hook reativo: re-renderiza quando o Modo Lite liga/desliga. */
export function useLite(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isLite,
    () => false,
  );
}
