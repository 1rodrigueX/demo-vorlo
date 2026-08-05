"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { CtaButton } from "@/components/site/CtaButton";
import { WordReveal } from "@/components/site/WordReveal";
import { HeroMark } from "@/components/site/HeroMark";
import { HERO } from "@/lib/site/content";

/** Herói: título curto revelado palavra a palavra + símbolo girando 360°. */
export function Hero() {
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
  };
  const item = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section id="topo" className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20 sm:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,87,34,0.13) 0%, rgba(255,87,34,0.04) 42%, transparent 70%)",
        }}
      />

      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <motion.div variants={container} initial="hidden" animate="visible" className="max-w-xl">
          <motion.p variants={item} className="type-eyebrow mb-6">
            {HERO.eyebrow}
          </motion.p>

          <h1 className="type-display text-[clamp(2.5rem,7vw,4.7rem)] text-white-soft text-balance">
            <span className="sr-only">{HERO.title}</span>
            <span aria-hidden>
              <WordReveal text="Sua empresa," delay={0.06} start />
              <br />
              <WordReveal text="uma" delay={0.2} start />{" "}
              <WordReveal text="potência digital." className="text-ignite type-glow-soft" delay={0.265} start />
            </span>
          </h1>

          <motion.p variants={item} className="mt-7 max-w-md text-base leading-relaxed text-grey sm:text-lg">
            {HERO.subtitle}
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-col gap-3.5 sm:flex-row sm:items-center">
            <CtaButton href="/orcamento" pulse className="w-full sm:w-auto">
              {HERO.primaryCta}
              <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
            </CtaButton>
            <CtaButton href="/#servicos" variant="ghost" className="w-full sm:w-auto">
              {HERO.secondaryCta}
            </CtaButton>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <HeroMark />
        </motion.div>
      </div>
    </section>
  );
}
