import { redirect } from "next/navigation";

// Música (YouTube + Spotify) desativada temporariamente a pedido do usuário
// (2026-07-17) — a rota /musica só redireciona pro dashboard, sem carregar
// nada do player. Toda a implementação original fica comentada abaixo pra
// reativar depois é só remover o /* */ e apagar esse redirect.
export default function MusicaPage() {
  redirect("/dashboard");
}

/*
"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Play, Pause, Square, Search, Music } from "lucide-react";
import { useMusicPlayer } from "@/lib/music/MusicPlayerContext";
import { useSpotifyPlayer } from "@/lib/spotify/SpotifyPlayerContext";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { searchYoutube, type YoutubeSearchResult } from "@/lib/actions/youtube";
import { searchSpotify, getSpotifyStatus, disconnectSpotify, type SpotifyTrack } from "@/lib/actions/spotify";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const SPOTIFY_STATUS_MESSAGE: Record<string, { text: string; tone: "error" | "success" }> = {
  connected: { text: "Spotify conectado!", tone: "success" },
  error: { text: "Não foi possível conectar sua conta do Spotify. Tente novamente.", tone: "error" },
  not_configured: { text: "O Spotify ainda não foi configurado nesta plataforma.", tone: "error" },
};

function MusicaPageContent_DISABLED() {
  return (
    <Suspense fallback={null}>
      <MusicaPageContent />
    </Suspense>
  );
}

function MusicaPageContent() {
  const [provider, setProvider] = useState<"youtube" | "spotify">("youtube");
  const searchParams = useSearchParams();
  const spotifyParam = searchParams.get("spotify");
  const spotifyStatusMessage = spotifyParam ? SPOTIFY_STATUS_MESSAGE[spotifyParam] : undefined;

  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const [spotifyProduct, setSpotifyProduct] = useState<string | null>(null);

  useEffect(() => {
    getSpotifyStatus().then((s) => {
      setSpotifyConnected(s.connected);
      setSpotifyProduct(s.product);
      if (s.connected) setProvider("spotify");
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Música</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pesquise uma música e continue ouvindo enquanto trabalha — toca em qualquer tela do CRM.
        </p>
      </div>

      {spotifyStatusMessage && (
        <Card
          className={
            spotifyStatusMessage.tone === "success" ? "p-4 text-sm text-emerald-700" : "p-4 text-sm text-red-600"
          }
        >
          {spotifyStatusMessage.text}
        </Card>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProvider("spotify")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${provider === "spotify" ? "bg-[#1DB954] text-white" : "bg-gray-100 text-gray-600"}`}
        >
          Spotify
        </button>
        <button
          type="button"
          onClick={() => setProvider("youtube")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${provider === "youtube" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          YouTube
        </button>
      </div>

      {provider === "spotify" && (
        <SpotifyPanel connected={spotifyConnected} product={spotifyProduct} onDisconnect={() => setSpotifyConnected(false)} />
      )}
      {provider === "youtube" && <YoutubePanel />}
    </div>
  );
}

function SpotifyPanel({
  connected,
  product,
  onDisconnect,
}: {
  connected: boolean | null;
  product: string | null;
  onDisconnect: () => void;
}) {
  const { brandColor } = useTenantTheme();
  const { isReady, isPlaying, trackName, error: playerError, playTrack, togglePlay, setVolume } = useSpotifyPlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    startSearch(async () => {
      const result = await searchSpotify(query.trim());
      if ("error" in result) {
        setError(result.error);
        setResults([]);
        return;
      }
      setResults(result.results);
    });
  }

  function handleDisconnect() {
    startDisconnect(async () => {
      await disconnectSpotify();
      onDisconnect();
    });
  }

  if (connected === null) {
    return <Card className="p-6 text-sm text-gray-400">Carregando...</Card>;
  }

  if (!connected) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954] text-white">
          <Music size={20} />
        </div>
        <p className="text-sm text-gray-600">
          Conecte sua conta do Spotify (precisa ser <span className="font-medium">Premium</span> pra tocar as
          faixas completas).
        </p>
        <a href="/api/spotify/authorize">
          <Button type="button">Conectar Spotify</Button>
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {product && product !== "premium" && (
        <Card className="p-4 text-sm text-amber-700">
          Sua conta do Spotify é <span className="font-medium">{product}</span> — reprodução completa exige
          Premium. A busca funciona normalmente, mas tocar a faixa pode falhar.
        </Card>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar artista, música..." className="flex-1" />
        <Button type="submit" isLoading={isSearching} disabled={!isReady}>
          <Search size={15} />
          Buscar
        </Button>
        <Button type="button" variant="secondary" onClick={handleDisconnect} isLoading={isDisconnecting}>
          Desconectar
        </Button>
      </form>

      {!isReady && <p className="text-xs text-gray-400">Conectando ao player do Spotify...</p>}
      {error && <Card className="p-4 text-sm text-red-600">{error}</Card>}
      {playerError && <Card className="p-4 text-sm text-red-600">{playerError}</Card>}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((track) => (
            <button
              key={track.uri}
              type="button"
              onClick={() => playTrack(track.uri)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-panel p-2 text-left transition-colors hover:border-gray-300"
            >
              <img src={track.albumArt} alt={track.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{track.name}</p>
                <p className="truncate text-xs text-gray-500">{track.artists}</p>
              </div>
              <div style={{ backgroundColor: brandColor }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
                <Play size={13} />
              </div>
            </button>
          ))}
        </div>
      )}

      {trackName && (
        <Card className="sticky bottom-4 flex items-center gap-3 p-4 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{trackName}</p>
            <p className="text-xs text-gray-400">{isPlaying ? "Tocando" : "Pausado"}</p>
          </div>
          <input type="range" min={0} max={100} defaultValue={70} onChange={(e) => setVolume(Number(e.target.value))} className="w-24" />
          <button
            type="button"
            onClick={togglePlay}
            style={{ backgroundColor: brandColor }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            aria-label={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </Card>
      )}
    </div>
  );
}

function YoutubePanel() {
  const { isReady, isPlaying, title, volume, loadFromUrl, togglePlay, setVolume, stop } = useMusicPlayer();
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
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar artista, música..." className="flex-1" />
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
                  <img src={result.thumbnailUrl} alt={result.title} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{result.title}</p>
                  <p className="truncate text-xs text-gray-500">{result.channelTitle}</p>
                </div>
                <div style={{ backgroundColor: brandColor }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
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
          <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-24" />
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
*/
