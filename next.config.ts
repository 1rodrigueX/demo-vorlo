import type { NextConfig } from "next";

const SUPABASE_URL = "https://ngczkxagctzlrrfrfffq.supabase.co";
const SUPABASE_WS_URL = SUPABASE_URL.replace("https://", "wss://");

// 'unsafe-inline' em script-src é necessário porque o App Router injeta o
// payload de RSC via <script> inline (self.__next_f.push(...)) sem nonce —
// CSP com nonce exigiria gerar e propagar esse valor em todo response via
// middleware, escopo maior que o desta blindagem. Mesmo assim, a política
// abaixo já fecha a superfície que mais importa: nenhum script/conexão pra
// domínio externo desconhecido, nenhum iframe alheio embutindo o site.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://sdk.scdn.co",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_URL}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_URL} ${SUPABASE_WS_URL} https://sdk.scdn.co`,
  "frame-src https://www.youtube.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Permite acessar o dev server pelo IP de rede (ex: outro PC testando a
  // landing page) sem o Next bloquear os recursos de HMR como cross-origin.
  allowedDevOrigins: ["192.168.18.4"],
  // pino/baileys use dynamic requires (worker-thread transports) that break
  // if Next tries to bundle them. discord.js's Gateway layer has the same
  // issue with an optional native compression dep (zlib-sync) it tries to
  // dynamic-import and gracefully falls back on if missing — Turbopack
  // insists on resolving it statically unless it's external.
  serverExternalPackages: ["@whiskeysockets/baileys", "pino", "discord.js"],
  // The Baileys session folder isn't a real code dependency — exclude it so
  // Next's file tracer doesn't treat it as a broad, slow-to-scan pattern.
  outputFileTracingExcludes: {
    "*": [".baileys_auth/**"],
  },
  experimental: {
    // Default 1MB é menor que o catálogo (até 20MB) e fotos de produto (até
    // 10MB) enviados via Server Action em Configurações > Sobre a empresa.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
