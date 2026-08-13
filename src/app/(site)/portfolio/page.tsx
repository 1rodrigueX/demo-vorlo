"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { CtaButton } from "@/components/site/CtaButton";
import { CrmCarousel } from "@/components/site/CrmCarousel";
import { GithubRepos } from "@/components/site/sections/GithubRepos";
import { LogoMark } from "@/components/site/brand/LogoMark";
import { PORTFOLIO } from "@/lib/site/content";
import { cn } from "@/lib/utils/cn";

interface CaseProps {
  index: string;
  meta: string;
  title: string;
  desc: string;
  feats: string[];
  stack: string[];
  flip?: boolean;
  cta?: { label: string; href: string };
  tag?: string;
  visual: ReactNode;
}

/** Case-study: texto de um lado, mockup de navegador do outro (alterna com flip). */
function CaseStudy({ index, meta, title, desc, feats, stack, flip, cta, tag, visual }: CaseProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "grid grid-cols-1 items-center gap-8 lg:gap-14",
        flip ? "lg:grid-cols-[1.18fr_0.82fr]" : "lg:grid-cols-[0.82fr_1.18fr]",
      )}
    >
      <div className={cn(flip ? "lg:order-2" : "lg:order-1")}>
        <p className="mb-4 font-mono text-[0.72rem] tracking-[0.1em] text-grey/70">
          <span className="text-ignite">{index}</span> — {meta}
        </p>
        <h2 className="type-display text-[clamp(1.7rem,3.6vw,2.5rem)] text-white-soft">{title}</h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-grey">{desc}</p>

        <ul className="mt-6 grid gap-2.5">
          {feats.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm leading-snug text-white-soft">
              <Check size={15} className="mt-0.5 shrink-0 text-ignite" />
              {f}
            </li>
          ))}
        </ul>

        <ul className="mt-7 flex flex-wrap gap-1.5">
          {stack.map((s) => (
            <li
              key={s}
              className="rounded-md border border-carbon-700 px-2 py-1 font-mono text-[0.66rem] tracking-wide text-grey"
            >
              {s}
            </li>
          ))}
        </ul>

        {cta ? (
          <a
            href={cta.href}
            className="group mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-ignite transition-colors hover:text-ignite-soft"
          >
            {cta.label}
            <ArrowUpRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        ) : null}

        {tag ? (
          <span className="mt-8 inline-flex items-center gap-2.5 text-sm text-grey">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#46d17f] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#46d17f]" />
            </span>
            {tag}
          </span>
        ) : null}
      </div>

      <div className={cn(flip ? "lg:order-1" : "lg:order-2")}>{visual}</div>
    </motion.article>
  );
}

export default function PortfolioPage() {
  return (
    <section className="relative min-h-[100svh] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto w-full max-w-[1240px]">
        <a
          href="/"
          className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-grey transition-colors hover:text-ignite"
        >
          <ArrowLeft size={15} />
          Voltar para o início
        </a>

        <motion.header
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 max-w-2xl sm:mb-20"
        >
          <p className="type-eyebrow mb-4">{PORTFOLIO.eyebrow}</p>
          <h1 className="type-display text-[clamp(2.1rem,5.5vw,3.6rem)] text-white-soft text-balance">
            {PORTFOLIO.title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-grey sm:text-lg">{PORTFOLIO.intro}</p>
        </motion.header>

        <div className="flex flex-col gap-20 sm:gap-28">
          {/* Case 01 — CRM */}
          <CaseStudy
            index="01"
            meta="Produto próprio · Plataforma SaaS · 2026"
            title="Vorlo CRM"
            desc="Um CRM de vendas onde o WhatsApp, o pipeline e agentes de IA trabalham juntos. Multi-empresa, em tempo real, com app desktop nativo."
            feats={[
              "Pipeline visual arrastar-e-soltar, com etapas por cliente",
              "WhatsApp integrado — texto, áudio e arquivos, com IA que atende e qualifica",
              "Trajetórias no estilo n8n, criadas pelo usuário ou pela própria IA",
              "Dados sigilosos criptografados (AES-256) e conformidade LGPD",
            ]}
            stack={["Next.js 16", "React 19", "Supabase", "TypeScript", "IA · Claude", "Tauri"]}
            cta={{ label: "Criar conta grátis", href: "/signup" }}
            visual={<CrmCarousel />}
          />

          {/* Case 02 — o próprio site */}
          <CaseStudy
            index="02"
            meta="Marca própria · Site institucional · 2026"
            title="vorlo.com.br"
            desc="O site que você está navegando. Identidade construída em torno do símbolo-constelação, com movimento sutil e carregamento abaixo de 2 segundos."
            feats={[
              "Símbolo da marca em SVG animado — montagem + rotação 360°",
              "Design system carbono + ignite, modo escuro nativo",
              "Animações com motion, sem pesar na performance",
              "Feito à mão em código — sem template, sem construtor",
            ]}
            stack={["Next.js", "motion/react", "Tailwind v4", "SVG"]}
            tag="Você está nele agora"
            flip
            visual={
              <div className="pf-browser">
                <div className="pf-browser__bar">
                  <div className="pf-browser__dots">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="pf-browser__url">vorlo.com.br</div>
                </div>
                <div className="pf-browser__body">
                  <div className="pf-site">
                    <div className="pf-site__bar">
                      <span className="pf-site__brand">VORLO</span>
                      <div className="pf-site__nav">
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                    <div className="pf-site__hero">
                      <div className="pf-site__copy">
                        <h4>
                          Presença digital <span>que vende</span>.
                        </h4>
                        <p>Sites, e-commerce e CRM que vendem.</p>
                        <span className="pf-site__pill">Solicitar orçamento</span>
                      </div>
                      <LogoMark mode="static" className="pf-site__mark" />
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </div>

        <GithubRepos />

        <div className="mt-24 flex flex-col items-start gap-6 border-t border-carbon-700 pt-14 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="type-display text-[clamp(1.5rem,3.5vw,2.2rem)] text-white-soft">
            Seu projeto pode ser o próximo.
          </h2>
          <CtaButton href="/orcamento" className="shrink-0">
            Solicitar orçamento
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
