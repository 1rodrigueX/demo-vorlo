"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

/*
 * Store de tema baseado no atributo data-theme do <html> (setado antes do
 * paint pelo script anti-flash no RootLayout). Usa useSyncExternalStore em vez
 * de useState+useEffect pra ler estado externo (DOM/localStorage) sem cair no
 * lint react-hooks/set-state-in-effect e sem mismatch de hidratação.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

// No servidor (e na hidratação) o tema real do usuário é desconhecido — assume
// claro; o useSyncExternalStore reconcilia pro valor real após hidratar.
function getServerSnapshot(): Theme {
  return "light";
}

export function setTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem("theme", t);
  } catch {
    /* localStorage bloqueado (modo privado) — só não persiste. */
  }
  emit();
}

export function toggleTheme() {
  setTheme(getSnapshot() === "dark" ? "light" : "dark");
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, setTheme, toggle: toggleTheme };
}
