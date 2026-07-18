import { redirect } from "next/navigation";

/**
 * Sem isso, "/app-web" cai no segmento dinâmico [tenantSlug] (trata "app-web"
 * como slug de tenant) antes mesmo de chegar no arquivo estático. Uma rota
 * explícita aqui tem prioridade sobre a dinâmica no App Router.
 */
export default function AppWebIndexRedirect() {
  redirect("/app-web/index.html");
}
