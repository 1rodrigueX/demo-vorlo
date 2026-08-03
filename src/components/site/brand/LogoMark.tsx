"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { EDGES, LEFT_FLANK, NODES, NODE_BY_ID, NODE_R, STROKE_W, VIEWBOX, edgeLength } from "./geometry";

interface LogoMarkProps {
  className?: string;
  mode?: "static" | "assemble" | "hover";
  delay?: number;
  title?: string;
}

/** Símbolo SYNEXA em SVG puro — 7 nós, 13 arestas + flanco curvo. Herda a cor
 * via currentColor. */
export function LogoMark({ className, mode = "static", delay = 0, title }: LogoMarkProps) {
  const reduce = useReducedMotion();
  const animate = mode !== "static" && !reduce;
  const maxLen = Math.max(...EDGES.map(edgeLength));

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      className={cn("block overflow-visible", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      {title ? <title>{title}</title> : null}

      <g stroke="currentColor" strokeWidth={STROKE_W} strokeLinecap="round" vectorEffect="non-scaling-stroke">
        {EDGES.map(([a, b], i) => {
          const p = NODE_BY_ID[a];
          const q = NODE_BY_ID[b];
          const dur = 0.24 + (edgeLength([a, b]) / maxLen) * 0.26;
          return (
            <motion.line
              key={`${a}-${b}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              pathLength={1}
              strokeDasharray={1}
              initial={animate ? { strokeDashoffset: 1, opacity: 0 } : false}
              animate={{ strokeDashoffset: 0, opacity: 1 }}
              transition={{ duration: dur, delay: delay + 0.45 + i * 0.03, ease: [0.65, 0, 0.35, 1] }}
            />
          );
        })}

        <motion.path
          d={LEFT_FLANK}
          pathLength={1}
          strokeDasharray={1}
          initial={animate ? { strokeDashoffset: 1, opacity: 0 } : false}
          animate={{ strokeDashoffset: 0, opacity: 1 }}
          transition={{ duration: 0.56, delay: delay + 0.45, ease: [0.65, 0, 0.35, 1] }}
        />
      </g>

      <g fill="currentColor">
        {NODES.map((n) => (
          <motion.circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={NODE_R}
            initial={animate ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            transition={{ type: "spring", stiffness: 420, damping: 18, delay: delay + n.order * 0.06 }}
          />
        ))}
      </g>
    </svg>
  );
}
