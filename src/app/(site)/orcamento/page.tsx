"use client";

import { motion } from "motion/react";
import { ArrowLeft, Clock, FileSignature, ShieldCheck } from "lucide-react";
import { QuoteForm } from "@/components/site/sections/QuoteForm";
import { QUOTE } from "@/lib/site/content";

const REASSEGURA = [
  { icon: Clock, titulo: "Resposta em 1 dia útil", corpo: "Sem fila e sem robô. Quem responde é quem vai tocar o projeto." },
  { icon: FileSignature, titulo: "Orçamento fechado", corpo: "Escopo, prazo e valor por escrito. Nada de \"a partir de\"." },
  { icon: ShieldCheck, titulo: "Sem compromisso", corpo: "Pedir orçamento não contrata nada. Se não fizer sentido, a gente diz." },
];

export default function OrcamentoPage() {
  return (
    <section className="relative min-h-[100svh] px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto w-full max-w-[1240px]">
        <a href="/" className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-grey transition-colors hover:text-ignite">
          <ArrowLeft size={15} />
          Voltar para o início
        </a>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
          <div>
            <motion.header
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-10"
            >
              <p className="type-eyebrow mb-4">{QUOTE.eyebrow}</p>
              <h1 className="type-display text-[clamp(2.1rem,5.5vw,3.6rem)] text-white-soft text-balance">
                Conte sua ideia. Devolvemos <span className="text-ignite">escopo, prazo e valor</span>.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-grey">{QUOTE.intro}</p>
            </motion.header>

            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <QuoteForm />
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:pt-4"
          >
            <ul className="space-y-8">
              {REASSEGURA.map((r) => (
                <li key={r.titulo}>
                  <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-carbon-700 bg-carbon-800 text-ignite">
                    <r.icon size={17} strokeWidth={1.8} />
                  </span>
                  <h2 className="text-[0.95rem] font-bold tracking-tight text-white-soft">{r.titulo}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-grey">{r.corpo}</p>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
