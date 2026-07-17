"use client";

import { Play, Pause, Music } from "lucide-react";
import { useMusicPlayer } from "@/lib/music/MusicPlayerContext";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";

/** Mini-controle que fica visível em qualquer tela do CRM enquanto tem música tocando/pausada. */
export function MusicWidget() {
  const { title, isPlaying, togglePlay } = useMusicPlayer();
  const { brandColor } = useTenantTheme();

  if (!title) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex max-w-[240px] items-center gap-2 rounded-full border border-gray-200 bg-panel py-1.5 pl-1.5 pr-3 shadow-lg">
      <button
        onClick={togglePlay}
        style={{ backgroundColor: brandColor }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
        aria-label={isPlaying ? "Pausar música" : "Tocar música"}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <Music size={13} className="shrink-0 text-gray-400" />
      <span className="truncate text-xs text-gray-600">{title}</span>
    </div>
  );
}
