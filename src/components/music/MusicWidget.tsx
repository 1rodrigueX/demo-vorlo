"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Music } from "lucide-react";
import { useMusicPlayer } from "@/lib/music/MusicPlayerContext";
import { useSpotifyPlayer } from "@/lib/spotify/SpotifyPlayerContext";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { cn } from "@/lib/utils/cn";

const STORAGE_POSITION_KEY = "musicWidgetPosition";
const EDGE_MARGIN_PX = 8;

type Position = { x: number; y: number };

/** Mini-controle que fica visível em qualquer tela do CRM enquanto tem música tocando/pausada — arrastável. */
export function MusicWidget() {
  const music = useMusicPlayer();
  const spotify = useSpotifyPlayer();
  const { brandColor } = useTenantTheme();

  const usingSpotify = !!spotify.trackName;
  const title = usingSpotify ? spotify.trackName : music.title;
  const isPlaying = usingSpotify ? spotify.isPlaying : music.isPlaying;
  const togglePlay = usingSpotify ? spotify.togglePlay : music.togglePlay;

  const widgetRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_POSITION_KEY);
    if (!saved) return;
    try {
      setPosition(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_POSITION_KEY);
    }
  }, []);

  function clamp(x: number, y: number): Position {
    const w = widgetRef.current?.offsetWidth ?? 240;
    const h = widgetRef.current?.offsetHeight ?? 44;
    const maxX = Math.max(window.innerWidth - w - EDGE_MARGIN_PX, EDGE_MARGIN_PX);
    const maxY = Math.max(window.innerHeight - h - EDGE_MARGIN_PX, EDGE_MARGIN_PX);
    return { x: Math.min(Math.max(x, EDGE_MARGIN_PX), maxX), y: Math.min(Math.max(y, EDGE_MARGIN_PX), maxY) };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Clique começando no botão de play/pause não deve virar arraste — deixa
    // o clique nativo do botão intocado (sem pointer capture disputando com ele).
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    draggingRef.current = true;
    dragStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, posX: rect.left, posY: rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    setPosition(clamp(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy));
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setPosition((current) => {
      if (current) localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify(current));
      return current;
    });
  }

  if (!title) return null;

  return (
    <div
      ref={widgetRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: "none", ...(position ? { left: position.x, top: position.y } : {}) }}
      className={cn(
        "fixed z-40 flex max-w-[240px] cursor-grab items-center gap-2 rounded-full border border-gray-200 bg-panel py-1.5 pl-1.5 pr-3 shadow-lg select-none active:cursor-grabbing",
        !position && "bottom-5 right-5",
      )}
    >
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
