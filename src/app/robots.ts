import type { MetadataRoute } from "next";

/**
 * Sem isso o crawler batia em /robots.txt, caía no gate de sessão do
 * middleware (rota não excluída) e recebia um redirect pro /login em vez
 * de um robots.txt de verdade — achado durante a auditoria de segurança.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://falaai.cloud";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dev", "/central", "/api", "/choose-plan", "/comprar-transportadora", "/comprar-financas"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
