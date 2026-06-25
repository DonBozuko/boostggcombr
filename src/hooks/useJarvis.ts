import { useCallback, useEffect, useRef } from "react";

/**
 * Jarvis Sound System — wiring para 4 eventos críticos de caixa.
 * Caminho B (real): arquivos fixos em /assets/sounds/jarvis-fx/.
 * Se o mp3 não existir, falha silenciosamente (sem quebrar UI).
 */
export type JarvisEvent = "welcome" | "optimized" | "warning" | "critical";

const SRC: Record<JarvisEvent, string> = {
  welcome:   "/assets/sounds/jarvis-fx/jarvis-welcome.mp3",
  optimized: "/assets/sounds/jarvis-fx/jarvis-optimized.mp3",
  warning:   "/assets/sounds/jarvis-fx/jarvis-warning.mp3",
  critical:  "/assets/sounds/jarvis-fx/jarvis-critical.mp3",
};

export function useJarvis(enabled: boolean = true) {
  const cacheRef = useRef<Partial<Record<JarvisEvent, HTMLAudioElement>>>({});
  const firedRef = useRef<Partial<Record<string, boolean>>>({});

  const play = useCallback((evt: JarvisEvent) => {
    if (!enabled || typeof window === "undefined") return;
    try {
      let a = cacheRef.current[evt];
      if (!a) {
        a = new Audio(SRC[evt]);
        a.preload = "auto";
        a.volume = 0.7;
        cacheRef.current[evt] = a;
      }
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }, [enabled]);

  /** Dispara uma única vez por key (ex: "warning:cart-3"). */
  const playOnce = useCallback((evt: JarvisEvent, key: string) => {
    const k = `${evt}:${key}`;
    if (firedRef.current[k]) return;
    firedRef.current[k] = true;
    play(evt);
  }, [play]);

  return { play, playOnce };
}

export function useJarvisWelcome(enabled: boolean) {
  const { play } = useJarvis(enabled);
  useEffect(() => {
    if (!enabled) return;
    // requer gesto do usuário (toggle Som ON) — então só dispara quando enabled vira true
    play("welcome");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
