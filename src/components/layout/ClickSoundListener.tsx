"use client";

import { useEffect, useRef } from "react";

/** Toca um som curto a cada clique na dashboard, se o tenant configurou um em Configurações > Aparência. */
export function ClickSoundListener({ soundUrl }: { soundUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(soundUrl);
    audioRef.current.volume = 0.5;

    function handleClick() {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // autoplay pode ser bloqueado até o primeiro gesto do usuário — ignora silenciosamente
      });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [soundUrl]);

  return null;
}
