"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { CtaButton } from "@/components/site/CtaButton";
import { FINAL_CTA } from "@/lib/site/content";

/** Bloco laranja de fechamento — a única inversão de cor da página. */
export function FinalCta() {
  return (
    <section className="relative px-5 pb-20 pt-10 sm:px-8 sm:pb-28">
      <div className="mx-auto w-full max-w-[1240px]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl bg-ignite px-7 py-14 shadow-[0_0_80px_-20px_rgba(255,87,34,0.6)] sm:px-14 sm:py-20"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <h2 className="type-display text-[clamp(2rem,6vw,3.6rem)] text-carbon-900 text-balance">{FINAL_CTA.title}</h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-carbon-900/80 sm:text-lg">{FINAL_CTA.body}</p>
            <CtaButton href="/orcamento" variant="inverse" className="mt-10 w-full sm:w-auto">
              {FINAL_CTA.cta}
              <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
            </CtaButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
