/**
 * Texto de marketing (tagline + bullets) de cada plano, por nome. Fica no
 * front porque não afeta cobrança — os números que importam (preço,
 * limites) continuam 100% em billing_plans. Se um plano novo não tiver
 * entrada aqui, cai no fallback genérico.
 */
export const PLAN_COPY: Record<string, { tagline: string; bullets: string[] }> = {
  Starter: {
    tagline: "Pra começar a organizar as vendas sem complicação.",
    bullets: ["Pipeline visual completo", "WhatsApp integrado", "1 agente de IA (Vorlo)"],
  },
  Pro: {
    tagline: "O mais escolhido — equipe maior, mais agentes de IA.",
    bullets: [
      "Tudo do Starter",
      "Mais vendedores e gestores inclusos",
      "2 agentes de IA (SDR, atendente...)",
      "Integrações extras liberadas",
    ],
  },
  Enterprise: {
    tagline: "Pra operação grande, com equipe e IA em escala.",
    bullets: [
      "Tudo do Pro",
      "Equipe grande inclusa",
      "5 agentes de IA inclusos",
      "Menor custo por vendedor/integração extra",
    ],
  },
};

export const DEFAULT_PLAN_COPY = {
  tagline: "Monte o plano do jeito que sua equipe precisa.",
  bullets: ["Pipeline de vendas", "WhatsApp integrado", "Agentes de IA (Vorlo)"],
};

export function getPlanCopy(planName: string) {
  return PLAN_COPY[planName] ?? DEFAULT_PLAN_COPY;
}
