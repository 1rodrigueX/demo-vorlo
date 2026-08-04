# Synexa Desktop (Windows)

App desktop **leve** da Synexa: uma casca nativa em **Tauri** (núcleo em Rust,
webview do sistema) que abre o site da Synexa numa janela própria, com login e
todos os acessos idênticos ao navegador. Binário pequeno, pouca RAM.

- Janela/URL: definida em [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs) na
  constante `APP_URL` — troque para `https://synexa.cloud` quando o domínio
  estiver 100% no ar.
- Ícone: gerado da marca oficial (mesma geometria do site).

## Pré-requisitos (uma vez só)
1. **Node** (já instalado).
2. **Rust** (toolchain do Tauri) — instale com o rustup:
   - PowerShell: `winget install Rustlang.Rustup` (ou baixe `rustup-init.exe`)
   - Depois, feche/abra o terminal e confirme: `cargo --version`
3. **WebView2** — já vem no Windows 10/11 (não precisa instalar).

## Passos
```bash
cd apps/synexa-desktop
npm install                 # baixa a CLI do Tauri + sharp (gerador de ícone)
npm run gen:icon            # gera app-icon.png a partir da marca Synexa
npm run tauri -- icon app-icon.png   # gera o conjunto de ícones (inclui .ico)
npm run build               # compila o .exe (instalador NSIS)
```

O instalador sai em:
`src-tauri/target/release/bundle/nsis/Synexa_0.1.0_x64-setup.exe`
e o executável direto em `src-tauri/target/release/Synexa.exe`.

Para desenvolver com hot-reload da janela: `npm run dev`.

## Distribuição
Para o Windows não mostrar o aviso do SmartScreen ("editor desconhecido"),
assine o `.exe` com um **certificado de code-signing** (pago). Sem assinatura o
app funciona igual — só aparece o aviso na primeira execução.

## Atualização em tempo real
- **Dados**: o que o site já faz (Supabase realtime/polling) funciona igual
  dentro do app.
- **App**: dá pra ligar o *updater* embutido do Tauri numa próxima etapa (o app
  se atualiza sozinho a partir de um endpoint de release).
