"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Section } from "@/components/site/Section";
import { PROCESS } from "@/lib/site/content";

/** Timeline 01→04 com o fio preenchendo conforme o scroll. */
export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 78%", "end 55%"] });
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <Section
      id="processo"
      eyebrow="Processo"
      title={
        <>
          Quatro passos, <span className="text-ignite">zero surpresa</span>
        </>
      }
      intro="Você sabe em que etapa o projeto está a qualquer momento — e o que precisa de você em cada uma."
    >
      <div ref={ref} className="relative">
        <div aria-hidden className="absolute left-0 right-0 top-[19px] hidden h-px bg-carbon-700 lg:block">
          <motion.span className="block h-px origin-left bg-ignite" style={{ scaleX: progress }} />
        </div>
        <div aria-hidden className="absolute bottom-4 left-[19px] top-4 w-px bg-carbon-700 lg:hidden">
          <motion.span className="block w-px origin-top bg-ignite" style={{ scaleY: progress, height: "100%" }} />
        </div>

        <ol className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-8">
          {PROCESS.map((step, i) => (
            <motion.li
              key={step.step}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-5 lg:block"
            >
              <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-carbon-700 bg-carbon-900 font-mono text-[0.7rem] font-medium text-ignite lg:mb-6">
                {step.step}
              </span>
              <div className="pb-2 lg:pb-0">
                <h3 className="type-display text-[1.3rem] text-white-soft">{step.title}</h3>
                <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-grey">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
