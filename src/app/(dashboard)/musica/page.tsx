"use client";

import { useState } from "react";
import { Play, Pause, Square, Music } from "lucide-react";
import { useMusicPlayer } from "@/lib/music/MusicPlayerContext";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export default function MusicaPage() {
  const { isReady, isPlaying, title, volume, loadFromUrl, togglePlay, setVolume, stop } = useMusicPlayer();
  const { brandColor } = useTenantTheme();
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    loadFromUrl(url.trim());
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Música</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cole o link de um vídeo ou playlist do YouTube e continue ouvindo enquanto trabalha — a música toca em
          qualquer tela do CRM.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="url">Link do YouTube</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou uma playlist"
                className="flex-1"
              />
              <Button type="submit" disabled={!isReady}>
                Tocar
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-5">
          {title ? (
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: brandColor }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
              >
                <Music size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-400">{isPlaying ? "Tocando" : "Pausado"}</p>
              </div>
              <button
                type="button"
                onClick={togglePlay}
                style={{ backgroundColor: brandColor }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                aria-label={isPlaying ? "Pausar" : "Tocar"}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                type="button"
                onClick={stop}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-red-600"
                aria-label="Parar"
              >
                <Square size={14} />
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nada tocando ainda — cole um link acima.</p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Label className="shrink-0">Volume</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-8 shrink-0 text-right text-xs text-gray-400">{volume}%</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
