"use client";

import { motion, useReducedMotion } from "motion/react";
import { LogoMark } from "@/components/site/brand/LogoMark";

/** Palco do símbolo no herói: a marca se monta e entra em rotação 360°,
 * com halo cônico, anéis orbitais e um brilho radial discreto (pouco "neon"). */
export function HeroMark() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[460px] place-items-center">
      {/* brilho radial */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-[92%] w-[92%] rounded-full blur-[34px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,87,34,0.15), rgba(255,87,34,0.04) 45%, transparent 70%)",
        }}
      />

      {/* anel externo (gira lento, sentido anti-horário) */}
      <motion.div
        aria-hidden
        className="absolute h-full w-full rounded-full border border-dashed"
        style={{ borderColor: "rgba(255,87,34,0.07)" }}
        animate={reduce ? undefined : { rotate: -360 }}
        transition={reduce ? undefined : { duration: 46, repeat: Infinity, ease: "linear" }}
      />
      {/* anel interno */}
      <motion.div
        aria-hidden
        className="absolute h-[74%] w-[74%] rounded-full border border-dashed"
        style={{ borderColor: "rgba(255,87,34,0.14)" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 28, repeat: Infinity, ease: "linear" }}
      />
      {/* halo cônico */}
      <motion.div
        aria-hidden
        className="absolute h-[80%] w-[80%] rounded-full opacity-70 blur-[22px]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(255,87,34,0) 70deg, rgba(255,122,77,0.18) 190deg, rgba(255,87,34,0) 300deg, transparent 360deg)",
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 16, repeat: Infinity, ease: "linear" }}
      />

      {/* a marca: monta (assemble) e depois gira 360° continuamente */}
      <motion.div
        className="relative z-[2] w-[52%]"
        style={{ filter: "drop-shadow(0 0 8px rgba(255,87,34,0.2))" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { duration: 16, repeat: Infinity, ease: "linear", delay: 1.3 }}
      >
        <LogoMark mode="assemble" className="w-full text-ignite" />
      </motion.div>
    </div>
  );
}
