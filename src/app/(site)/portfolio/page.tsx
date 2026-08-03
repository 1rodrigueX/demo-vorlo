"use client";

import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { MagicCard } from "@/components/site/MagicCard";
import { CtaButton } from "@/components/site/CtaButton";
import { GithubRepos } from "@/components/site/sections/GithubRepos";
import { PORTFOLIO, PROJETOS } from "@/lib/site/content";

export default function PortfolioPage() {
  return (
    <section className="relative min-h-[100svh] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto w-full max-w-[1240px]">
        <a href="/" className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-grey transition-colors hover:text-ignite">
          <ArrowLeft size={15} />
          Voltar para o início
        </a>

        <motion.header
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 max-w-2xl"
        >
          <p className="type-eyebrow mb-4">{PORTFOLIO.eyebrow}</p>
          <h1 className="type-display text-[clamp(2.1rem,5.5vw,3.6rem)] text-white-soft text-balance">
            {PORTFOLIO.title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-grey sm:text-lg">{PORTFOLIO.intro}</p>
        </motion.header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PROJETOS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <MagicCard className="h-full rounded-xl border border-carbon-700 bg-carbon-800">
                <div className="flex h-full flex-col p-7">
                  <p className="type-mono-label mb-3 text-[0.68rem] uppercase tracking-[0.18em] text-ignite">
                    {p.categoria}
                    {p.ano ? ` · ${p.ano}` : ""}
                  </p>
                  <h2 className="type-display text-[1.4rem] leading-tight text-white-soft">{p.titulo}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-grey">{p.descricao}</p>
                  <ul className="mt-5 flex flex-wrap gap-1.5">
                    {p.stack.map((s) => (
                      <li key={s} className="rounded border border-carbon-700 px-2 py-1 font-mono text-[0.65rem] tracking-wide text-grey">
                        {s}
                      </li>
                    ))}
                  </ul>
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ignite"
                    >
                      Ver no ar <ArrowUpRight size={15} />
                    </a>
                  ) : null}
                </div>
              </MagicCard>
            </motion.div>
          ))}
        </div>

        <GithubRepos />

        <div className="mt-24 flex flex-col items-start gap-6 border-t border-carbon-700 pt-14 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="type-display text-[clamp(1.5rem,3.5vw,2.2rem)] text-white-soft">
            Seu projeto pode ser o próximo.
          </h2>
          <CtaButton href="/orcamento" className="shrink-0">Solicitar orçamento</CtaButton>
        </div>
      </div>
    </section>
  );
}
