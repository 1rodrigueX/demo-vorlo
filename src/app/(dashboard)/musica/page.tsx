"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Play, Pause, Square, Search } from "lucide-react";
import { useMusicPlayer } from "@/lib/music/MusicPlayerContext";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { searchYoutube, type YoutubeSearchResult } from "@/lib/actions/youtube";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function MusicaPage() {
  const {
    isReady,
    isPlaying,
    title,
    volume,
    error: playerError,
    loadFromUrl,
    togglePlay,
    setVolume,
    stop,
  } = useMusicPlayer();
  const { brandColor } = useTenantTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YoutubeSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    startSearch(async () => {
      const result = await searchYoutube(query.trim());
      if ("error" in result) {
        setError(result.error);
        setResults([]);
        return;
      }
      setResults(result.results);
    });
  }

  function handlePlay(result: YoutubeSearchResult) {
    setActiveVideoId(result.videoId);
    loadFromUrl(`https://www.youtube.com/watch?v=${result.videoId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Música</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pesquise uma música e continue ouvindo enquanto trabalha — toca em qualquer tela do CRM.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar artista, música..."
          className="flex-1"
        />
        <Button type="submit" isLoading={isSearching} disabled={!isReady}>
          <Search size={15} />
          Buscar
        </Button>
      </form>

      {error && (
        <Card className="p-4 text-sm text-red-600">
          {error}{" "}
          <Link href="/settings/integracoes" className="font-medium underline">
            Configurar em Configurações → Integrações
          </Link>
        </Card>
      )}

      {playerError && <Card className="p-4 text-sm text-red-600">{playerError}</Card>}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((result) => {
            const isActive = activeVideoId === result.videoId;
            return (
              <button
                key={result.videoId}
                type="button"
                onClick={() => handlePlay(result)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-panel p-2 text-left transition-colors hover:border-gray-300"
                style={isActive ? { borderColor: brandColor } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.thumbnailUrl} alt={result.title} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{result.title}</p>
                  <p className="truncate text-xs text-gray-500">{result.channelTitle}</p>
                </div>
                <div
                  style={{ backgroundColor: brandColor }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                >
                  {isActive && isPlaying ? <Pause size={13} /> : <Play size={13} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {title && (
        <Card className="sticky bottom-4 flex items-center gap-3 p-4 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{title}</p>
            <p className="text-xs text-gray-400">{isPlaying ? "Tocando" : "Pausado"}</p>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24"
          />
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
        </Card>
      )}
    </div>
  );
}
