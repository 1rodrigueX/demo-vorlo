import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vorlo.com.br";

/**
 * Sitemap das páginas públicas (site institucional + produto). Ajuda o Google a
 * descobrir e indexar o site. Só rotas públicas — nada de /dev, /central, app.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = ["", "/produtos", "/sobre", "/portfolio", "/orcamento", "/seguranca"];
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
