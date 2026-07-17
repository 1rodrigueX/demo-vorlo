"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSpotifyPlaybackToken, playSpotifyTrack } from "@/lib/actions/spotify";

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;
  addListener: (event: string, cb: (data: unknown) => void) => void;
};

type SpotifyState = {
  isReady: boolean;
  deviceId: string | null;
  isPlaying: boolean;
  trackName: string | null;
  error: string | null;
  playTrack: (uri: string) => Promise<void>;
  togglePlay: () => void;
  setVolume: (v: number) => void;
};

const SpotifyContext = createContext<SpotifyState | null>(null);

export function SpotifyPlayerProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function createPlayer() {
      if (!window.Spotify) return;

      const player = new window.Spotify.Player({
        name: "FALA AI CRM",
        volume: 0.7,
        getOAuthToken: (cb) => {
          getSpotifyPlaybackToken().then((result) => {
            if ("token" in result) cb(result.token);
          });
        },
      });

      player.addListener("ready", (data) => {
        const { device_id } = data as { device_id: string };
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener("not_ready", () => setIsReady(false));

      player.addListener("player_state_changed", (data) => {
        const state = data as {
          paused: boolean;
          track_window?: { current_track?: { name: string; artists: { name: string }[] } };
        } | null;
        if (!state) return;
        setIsPlaying(!state.paused);
        const current = state.track_window?.current_track;
        if (current) setTrackName(`${current.name} — ${current.artists.map((a) => a.name).join(", ")}`);
      });

      player.addListener("initialization_error", () => setError("Não foi possível iniciar o player do Spotify."));
      player.addListener("authentication_error", () => setError("Sessão do Spotify expirada — reconecte sua conta."));
      player.addListener("account_error", () =>
        setError("Sua conta do Spotify não é Premium — reprodução completa exige Premium."),
      );
      player.addListener("playback_error", () => setError("Não foi possível tocar essa faixa."));

      player.connect();
      playerRef.current = player;
    }

    if (window.Spotify) {
      createPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://sdk.scdn.co/spotify-player.js";
      tag.async = true;
      document.body.appendChild(tag);
      window.onSpotifyWebPlaybackSDKReady = createPlayer;
    }

    return () => {
      playerRef.current?.disconnect();
    };
  }, [enabled]);

  const playTrack = useCallback(async (uri: string) => {
    setError(null);
    if (!deviceId) return;
    const result = await playSpotifyTrack(deviceId, uri);
    if (result?.error) setError(result.error);
  }, [deviceId]);

  const togglePlay = useCallback(() => {
    playerRef.current?.togglePlay();
  }, []);

  const setVolume = useCallback((v: number) => {
    playerRef.current?.setVolume(v / 100);
  }, []);

  return (
    <SpotifyContext.Provider value={{ isReady, deviceId, isPlaying, trackName, error, playTrack, togglePlay, setVolume }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotifyPlayer() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotifyPlayer precisa estar dentro de SpotifyPlayerProvider");
  return ctx;
}
