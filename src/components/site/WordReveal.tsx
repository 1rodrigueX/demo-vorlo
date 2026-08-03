"use client";

import { Fragment, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";

interface WordProps {
  word: string;
  className?: string;
  delay: number;
  start: boolean;
  reduce: boolean;
}

function Word({ word, className, delay, start, reduce }: WordProps) {
  const [masked, setMasked] = useState(!reduce);
  return (
    <span
      className={cn(
        "inline-block pb-[0.14em] -mb-[0.14em] align-bottom",
        masked ? "overflow-hidden" : "overflow-visible",
        className,
      )}
    >
      <motion.span
        className="inline-block"
        initial={reduce ? false : { y: "108%", opacity: 0 }}
        animate={start || reduce ? { y: "0%", opacity: 1 } : { y: "108%", opacity: 0 }}
        transition={{ duration: 0.6, delay: reduce ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => setMasked(false)}
      >
        {word}
      </motion.span>
    </span>
  );
}

interface WordRevealProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  start?: boolean;
}

/** Revelação palavra a palavra com máscara (sobe de trás do overflow). */
export function WordReveal({ text, className, delay = 0, stagger = 0.065, start = true }: WordRevealProps) {
  const reduce = useReducedMotion() ?? false;
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <Word word={word} className={className} delay={delay + i * stagger} start={start} reduce={reduce} />
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
