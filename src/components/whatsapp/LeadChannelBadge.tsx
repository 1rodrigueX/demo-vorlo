"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";
import { CHANNEL_META, type ChannelKey } from "./channelMeta";

/**
 * Badge reutilizável de um canal do lead. Ativo = preenchido com a cor/gradiente
 * do canal, texto branco e brilho pulsante; inativo = discreto, com a cor só no
 * ícone. Altura 26px, radius total, 12px semibold, transição 200ms (spec 2c).
 */
export function LeadChannelBadge({
  channel,
  active = false,
  onClick,
}: {
  channel: ChannelKey;
  active?: boolean;
  onClick?: () => void;
}) {
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;

  // "--ch" alimenta a keyframe channel-pulse (globals.css). Cast necessário
  // porque CSSProperties não conhece custom properties.
  const activeStyle = {
    background: meta.gradient ?? meta.color,
    "--ch": meta.color,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={meta.label}
      className={cn(
        "inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
        active
          ? "lead-channel-active text-white"
          : "border border-gray-300 text-gray-600 hover:-translate-y-px hover:border-gray-400 hover:text-gray-900",
      )}
      style={active ? activeStyle : undefined}
    >
      <Icon size={13} strokeWidth={2.4} style={active ? undefined : { color: meta.color }} />
      {meta.label}
    </button>
  );
}
