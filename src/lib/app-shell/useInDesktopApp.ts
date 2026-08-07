"use client";

import { useSyncExternalStore } from "react";

/**
 * true quando a página está rodando dentro do app desktop (Tauri), false no
 * navegador.
 *
 * useSyncExternalStore em vez de useState+useEffect: é a API feita pra ler
 * estado que vive fora do React. O snapshot do servidor é sempre `false`, o do
 * cliente lê a janela — então a hidratação bate sem ninguém chamar setState
 * dentro de efeito.
 *
 * A janela do CRM recebe a API do Tauri por autorização explícita — ver
 * apps/synexa-desktop/src-tauri/capabilities/remote-crm.json.
 */

/** Não muda em tempo de execução: ou o app injetou a API no carregamento, ou não. */
function subscribe(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useInDesktopApp(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
