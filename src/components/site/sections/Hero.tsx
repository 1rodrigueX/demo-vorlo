"use client";

import { motion } from "motion/react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { CtaButton } from "@/components/site/CtaButton";
import { WordReveal } from "@/components/site/WordReveal";
import { HERO } from "@/lib/site/content";

/** Hero: título revelado palavra a palavra + brilho radial de fundo. */
export function Hero() {
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
  };
  const item = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section id="topo" className="relative flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20 sm:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,87,34,0.16) 0%, rgba(255,87,34,0.05) 42%, transparent 70%)",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-[1240px] px-5 sm:px-8"
      >
        <div className="max-w-4xl">
          <motion.p variants={item} className="type-eyebrow mb-7">
            {HERO.eyebrow}
          </motion.p>

          <h1 className="type-display text-[clamp(2.6rem,8vw,5.6rem)] text-white-soft text-balance">
            <span className="sr-only">{HERO.title}</span>
            <span aria-hidden>
              <WordReveal text="Transformamos sua empresa em uma" delay={0.06} start />{" "}
              <WordReveal
                text="potência digital"
                delay={0.06 + 5 * 0.065}
                className="text-ignite type-glow"
                start
              />
            </span>
          </h1>

          <motion.p variants={item} className="mt-8 max-w-2xl text-base leading-relaxed text-grey sm:text-lg">
            {HERO.subtitle}
          </motion.p>

          <motion.div variants={item} className="mt-11 flex flex-col gap-3.5 sm:flex-row sm:items-center">
            <CtaButton href="/orcamento" pulse className="w-full sm:w-auto">
              {HERO.primaryCta}
              <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
            </CtaButton>
            <CtaButton href="/#servicos" variant="ghost" className="w-full sm:w-auto">
              {HERO.secondaryCta}
            </CtaButton>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block"
      >
        <motion.span
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
          className="block text-ignite/70"
        >
          <ArrowDown size={18} />
        </motion.span>
      </motion.div>
    </section>
  );
}
