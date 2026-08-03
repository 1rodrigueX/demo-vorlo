"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils/cn";

interface SectionProps {
  id: string;
  eyebrow: string;
  title: ReactNode;
  intro?: string;
  children: ReactNode;
  className?: string;
}

/** Seção + "espinha" à esquerda (nó + fio que se desenha com o scroll). */
export function Section({ id, eyebrow, title, intro, children, className }: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 15%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const nodeGlow = useTransform(scrollYProgress, [0, 0.06, 1], [0, 1, 1]);

  return (
    <section ref={ref} id={id} className={cn("relative py-20 sm:py-28 lg:py-36", className)}>
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <div className="relative grid grid-cols-1 gap-x-10 lg:grid-cols-[64px_minmax(0,1fr)]">
          <div aria-hidden className="pointer-events-none absolute left-0 top-0 hidden h-full w-[64px] lg:block">
            <motion.span
              className="absolute left-[7px] top-[10px] block h-[9px] w-[9px] rounded-full bg-ignite"
              style={{ opacity: nodeGlow }}
            />
            <motion.span
              className="absolute left-[11px] top-[24px] block w-px bg-linear-to-b from-ignite to-ignite/10"
              style={{ height: "calc(100% - 24px)", scaleY, originY: 0 }}
            />
          </div>

          <div className="lg:col-start-2">
            <header className="mb-12 max-w-3xl sm:mb-16">
              <p className="type-eyebrow mb-4">{eyebrow}</p>
              <h2 className="type-display text-[clamp(2rem,5.2vw,3.6rem)] text-white-soft text-balance">{title}</h2>
              {intro ? (
                <p className="mt-5 max-w-xl text-base leading-relaxed text-grey sm:text-lg">{intro}</p>
              ) : null}
            </header>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
