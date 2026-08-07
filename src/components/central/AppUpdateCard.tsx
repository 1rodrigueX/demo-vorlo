"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Monitor, RefreshCw, CheckCircle2 } from "lucide-react";
import { useInDesktopApp } from "@/lib/app-shell/useInDesktopApp";

/**
 * O mesmo espaço serve dois contextos: no navegador oferece o download do app;
 * dentro do app, oferece a atualização.
 *
 * Sem isso, quem instalou o app só encontrava a verificação de atualização na
 * tela de antes do login — que o usuário vê uma vez e nunca mais, porque a
 * sessão fica salva.
 *
 * A API do Tauri só existe quando a página roda dentro do app (e a janela do
 * CRM está autorizada em capabilities/remote-crm.json). No navegador o objeto
 * não existe e o componente cai no card de download.
 */

type TauriUpdate = {
  version: string;
  body?: string;
  downloadAndInstall: (onEvent?: (event: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void) => Promise<void>;
};

type TauriApi = {
  updater?: { check: () => Promise<TauriUpdate | null> };
  process?: { relaunch: () => Promise<void> };
  app?: { getVersion: () => Promise<string> };
};

function getTauri(): TauriApi | null {
  if (typeof window === "undefined") return null;
  const api = (window as unknown as { __TAURI__?: TauriApi }).__TAURI__;
  return api?.updater ? api : null;
}

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "current" }
  | { kind: "available"; update: TauriUpdate }
  | { kind: "installing"; percent: number }
  | { kind: "error"; message: string };

export function AppUpdateCard({ downloadUrl }: { downloadUrl: string }) {
  const inApp = useInDesktopApp();
  const [version, setVersion] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });

  // A versão vem de uma chamada assíncrona ao app — o único motivo de existir
  // um efeito aqui. Se a permissão de leitura faltar, cai no catch e o card
  // segue funcionando sem mostrar o número.
  useEffect(() => {
    getTauri()
      ?.app?.getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  async function check() {
    const tauri = getTauri();
    if (!tauri?.updater) return;

    setState({ kind: "checking" });
    try {
      const update = await tauri.updater.check();
      setState(update ? { kind: "available", update } : { kind: "current" });
    } catch {
      // Servidor fora do ar não pode parecer defeito do app — o usuário
      // continua trabalhando normalmente.
      setState({ kind: "error", message: "Não deu pra verificar agora. Tente de novo mais tarde." });
    }
  }

  async function install(update: TauriUpdate) {
    const tauri = getTauri();
    setState({ kind: "installing", percent: 0 });

    let total = 0;
    let received = 0;

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data?.contentLength ?? 0;
        else if (event.event === "Progress") {
          received += event.data?.chunkLength ?? 0;
          if (total > 0) setState({ kind: "installing", percent: Math.round((received / total) * 100) });
        }
      });
      await tauri?.process?.relaunch();
    } catch {
      setState({ kind: "error", message: "A atualização falhou. Você pode seguir usando esta versão." });
    }
  }

  // No navegador (e durante a hidratação) mostra o card de download.
  if (!inApp) {
    return (
      <Shell
        title="App para computador (Windows)"
        description="Tenha a Synexa numa janela própria — abre direto nos seus acessos, como no navegador."
      >
        <a
          href={downloadUrl}
          download="Synexa-Setup.exe"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#ff5722] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
        >
          <Download size={16} />
          Baixar para Windows
        </a>
      </Shell>
    );
  }

  return (
    <Shell
      title="Atualizações do app"
      description={
        version ? `Você está na versão ${version}.` : "Verifique se saiu uma versão nova do aplicativo."
      }
    >
      <div className="flex flex-col items-start gap-2 sm:items-end">
        {state.kind === "available" ? (
          <button
            type="button"
            onClick={() => install(state.update)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#ff5722] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
          >
            <Download size={16} />
            Instalar versão {state.update.version}
          </button>
        ) : (
          <button
            type="button"
            onClick={check}
            disabled={state.kind === "checking" || state.kind === "installing"}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-panel px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={state.kind === "checking" ? "animate-spin" : undefined} />
            {state.kind === "checking" ? "Verificando..." : "Verificar atualizações"}
          </button>
        )}

        {state.kind === "current" && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 size={13} />
            Você já está na versão mais recente
          </span>
        )}
        <Link href="/novidades" className="text-xs text-gray-400 underline hover:text-gray-600">
          Ver o que mudou em cada versão
        </Link>
        {state.kind === "installing" && (
          <span className="text-xs text-gray-500">
            {state.percent > 0 ? `Baixando... ${state.percent}%` : "Baixando..."} O app reinicia sozinho.
          </span>
        )}
        {state.kind === "error" && <span className="text-xs text-red-600">{state.message}</span>}
      </div>
    </Shell>
  );
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#ff5722]/10 text-[#ff5722]">
          <Monitor size={22} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
