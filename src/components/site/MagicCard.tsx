"use client";

import { useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils/cn";

interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

/** Card com brilho que segue o cursor (borda laranja + halo interno). */
export function MagicCard({
  children,
  className,
  gradientSize = 240,
  gradientColor = "#1f1f1f",
  gradientOpacity = 0.6,
  gradientFrom = "#FF5722",
  gradientTo = "#7A2410",
}: MagicCardProps) {
  const off = -gradientSize * 10;
  const mouseX = useMotionValue(off);
  const mouseY = useMotionValue(off);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - r.left);
      mouseY.set(e.clientY - r.top);
    },
    [mouseX, mouseY],
  );
  const handleLeave = useCallback(() => {
    mouseX.set(off);
    mouseY.set(off);
  }, [mouseX, mouseY, off]);

  const border = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo}, transparent 70%)`;
  const glow = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 75%)`;

  return (
    <div onMouseMove={handleMove} onMouseLeave={handleLeave} className={cn("group relative overflow-hidden", className)}>
      {/* borda que acende no cursor */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: border }}
      />
      {/* interior (cobre a borda, deixa só ~1px acesa) */}
      <div className="absolute inset-px rounded-[inherit] bg-carbon-800" />
      {/* halo interno seguindo o cursor */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glow, opacity: gradientOpacity }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
