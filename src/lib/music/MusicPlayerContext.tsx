"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  setVolume: (v: number) => void;
  loadVideoById: (id: string) => void;
  loadPlaylist: (opts: { list: string }) => void;
  getVideoData?: () => { title?: string };
  destroy: () => void;
};

type MusicState = {
  isReady: boolean;
  isPlaying: boolean;
  title: string | null;
  volume: number;
  loadFromUrl: (url: string) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  stop: () => void;
};

const MusicContext = createContext<MusicState | null>(null);
const STORAGE_URL_KEY = "musicPlayerUrl";
const STORAGE_VOLUME_KEY = "musicPlayerVolume";

function extractYouTubeIds(url: string): { videoId?: string; listId?: string } {
  try {
    const parsed = new URL(url);
    const listId = parsed.searchParams.get("list") ?? undefined;
    let videoId = parsed.searchParams.get("v") ?? undefined;
    if (!videoId && parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1) || undefined;
    }
    if (!videoId && parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.replace("/embed/", "") || undefined;
    }
    return { videoId, listId };
  } catch {
    return {};
  }
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(70);

  const loadFromUrl = useCallback((url: string, persist = true) => {
    const { videoId, listId } = extractYouTubeIds(url);
    if (!playerRef.current) return;
    if (listId) {
      playerRef.current.loadPlaylist({ list: listId });
    } else if (videoId) {
      playerRef.current.loadVideoById(videoId);
    } else {
      return;
    }
    if (persist) localStorage.setItem(STORAGE_URL_KEY, url);
  }, []);

  useEffect(() => {
    function createPlayer() {
      if (!window.YT) return;
      playerRef.current = new window.YT.Player("music-player-host", {
        height: "200",
        width: "200",
        playerVars: { autoplay: 0, playsinline: 1 },
        events: {
          onReady: () => {
            setIsReady(true);
            const savedVolume = localStorage.getItem(STORAGE_VOLUME_KEY);
            if (savedVolume) {
              const v = Number(savedVolume);
              setVolumeState(v);
              playerRef.current?.setVolume(v);
            } else {
              playerRef.current?.setVolume(70);
            }
            const savedUrl = localStorage.getItem(STORAGE_URL_KEY);
            if (savedUrl) loadFromUrl(savedUrl, false);
          },
          onStateChange: (e: { data: number }) => {
            const playing = e.data === window.YT?.PlayerState.PLAYING;
            setIsPlaying(!!playing);
            if (playing) {
              const data = playerRef.current?.getVideoData?.();
              if (data?.title) setTitle(data.title);
            }
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [isPlaying]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    playerRef.current?.setVolume(v);
    localStorage.setItem(STORAGE_VOLUME_KEY, String(v));
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
    setTitle(null);
    localStorage.removeItem(STORAGE_URL_KEY);
  }, []);

  return (
    <MusicContext.Provider value={{ isReady, isPlaying, title, volume, loadFromUrl, togglePlay, setVolume, stop }}>
      <div
        id="music-player-host"
        className="fixed h-[200px] w-[200px] overflow-hidden"
        style={{ left: "-9999px", top: "-9999px" }}
      />
      {children}
    </MusicContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusicPlayer precisa estar dentro de MusicPlayerProvider");
  return ctx;
}
