"use client";

import { motion } from "motion/react";
import { ArrowLeft, MapPin } from "lucide-react";
import { LogoMark } from "@/components/site/brand/LogoMark";
import { CtaButton } from "@/components/site/CtaButton";
import { MagicCard } from "@/components/site/MagicCard";
import { SOBRE } from "@/lib/site/content";

function Principio({ titulo, corpo, index }: { titulo: string; corpo: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <MagicCard
        gradientSize={260}
        gradientColor="#1f1f1f"
        gradientOpacity={0.6}
        gradientFrom="#FF5722"
        gradientTo="#7A2410"
        className="h-full rounded-xl border border-carbon-700 bg-carbon-800"
      >
        <div className="flex h-full flex-col p-6 sm:p-7">
          <h3 className="type-display text-[1.15rem] leading-tight text-white-soft">{titulo}</h3>
          <p className="mt-3 text-sm leading-relaxed text-grey">{corpo}</p>
        </div>
      </MagicCard>
    </motion.div>
  );
}

export default function SobrePage() {
  return (
    <section className="relative min-h-[100svh] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto w-full max-w-[1240px]">
        <a href="/" className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-grey transition-colors hover:text-ignite">
          <ArrowLeft size={15} />
          Voltar para o início
        </a>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          <motion.header initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <p className="type-eyebrow mb-4">{SOBRE.eyebrow}</p>
            <h1 className="type-display text-[clamp(2.1rem,5.5vw,3.6rem)] text-white-soft text-balance">{SOBRE.nome}</h1>
            <p className="mt-4 text-base text-grey sm:text-lg">{SOBRE.papel}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-grey">
              <MapPin size={13} className="text-ignite" />
              {SOBRE.local}
            </p>
            <p className="mt-9 max-w-2xl border-l-2 border-ignite pl-6 text-[1.05rem] leading-relaxed text-white-soft sm:text-[1.15rem]">
              {SOBRE.manifesto}
            </p>
            <div className="mt-9 max-w-2xl space-y-5">
              {SOBRE.historia.map((p) => (
                <p key={p.slice(0, 40)} className="leading-relaxed text-grey">{p}</p>
              ))}
            </div>
          </motion.header>

          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}>
            <div className="overflow-hidden rounded-2xl border border-carbon-700 bg-carbon-800">
              <div className="grid aspect-[2/3] w-full place-items-center bg-carbon-900">
                <LogoMark className="h-20 w-auto text-carbon-700" />
              </div>
            </div>
            <div className="mt-8">
              <p className="type-mono-label mb-4 text-[0.68rem] uppercase tracking-[0.2em]">Ferramentas do dia a dia</p>
              <ul className="flex flex-wrap gap-1.5">
                {SOBRE.stack.map((t) => (
                  <li key={t} className="rounded border border-carbon-700 px-2.5 py-1.5 font-mono text-[0.7rem] tracking-wide text-grey">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        <div className="mt-24 sm:mt-32">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 max-w-2xl"
          >
            <p className="type-eyebrow mb-4">Como eu trabalho</p>
            <h2 className="type-display text-[clamp(1.8rem,4.5vw,2.8rem)] text-white-soft">
              Quatro regras que não <span className="text-ignite">negocio</span>
            </h2>
          </motion.header>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {SOBRE.principios.map((p, i) => (
              <Principio key={p.titulo} {...p} index={i} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 flex flex-col items-start gap-6 border-t border-carbon-700 pt-14 sm:mt-32 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="type-display text-[clamp(1.5rem,3.5vw,2.2rem)] text-white-soft">Vamos conversar sobre o seu projeto?</h2>
            <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-grey">
              Conte o que sua empresa precisa. Devolvo escopo, prazo e valor em até 1 dia útil.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaButton href="/orcamento" className="shrink-0">Solicitar orçamento</CtaButton>
            <CtaButton href="/portfolio" variant="ghost" className="shrink-0">Ver o portfólio</CtaButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
