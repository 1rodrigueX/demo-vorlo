"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { LeadChannelBadge } from "./LeadChannelBadge";
import type { ChannelKey } from "./channelMeta";

const MAX_VISIBLE = 4;

/**
 * Cabeçalho omnichannel: mostra até 4 canais do lead como badges; o excedente
 * fica atrás de um "+N" que abre um popover. Clicar num canal troca a timeline
 * na hora (estado no client, sem recarregar a página).
 */
export function LeadChannels({
  channels,
  active,
  onSelect,
}: {
  channels: ChannelKey[];
  active: ChannelKey;
  onSelect: (channel: ChannelKey) => void;
}) {
  const visible = channels.slice(0, MAX_VISIBLE);
  const overflow = channels.slice(MAX_VISIBLE);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((channel) => (
        <LeadChannelBadge
          key={channel}
          channel={channel}
          active={channel === active}
          onClick={() => onSelect(channel)}
        />
      ))}

      {overflow.length > 0 && (
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex h-[26px] shrink-0 items-center gap-0.5 rounded-full border border-gray-300 px-2.5 text-xs font-semibold text-gray-600 transition-all duration-200 hover:border-gray-400 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Plus size={12} strokeWidth={2.5} />
            {overflow.length}
          </button>

          {open && (
            <div className="absolute left-0 top-full z-20 mt-1.5 flex w-max max-w-[240px] flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-panel p-2 shadow-lg">
              {overflow.map((channel) => (
                <LeadChannelBadge
                  key={channel}
                  channel={channel}
                  active={channel === active}
                  onClick={() => {
                    onSelect(channel);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
