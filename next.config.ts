import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acessar o dev server pelo IP de rede (ex: outro PC testando a
  // landing page) sem o Next bloquear os recursos de HMR como cross-origin.
  allowedDevOrigins: ["192.168.18.4"],
  // pino/baileys use dynamic requires (worker-thread transports) that break
  // if Next tries to bundle them.
  serverExternalPackages: ["@whiskeysockets/baileys", "pino"],
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
