import { useCallback, useEffect, useRef, useState } from "react";
import { logJarvisAlert } from "@/lib/jarvis.functions";

/**
 * Jarvis Sound System — pré-carregamento com new Audio() + cache-buster v=5.
 * Persistência em banco (jarvis_alerts) + trava anti-spam (debounce 60s).
 */
export type JarvisEvent = "welcome" | "optimized" | "warning" | "critical" | "fail";

const SRC: Record<JarvisEvent, string> = {
  welcome:   "/assets/sounds/jarvis-fx/welcome.mp3?v=5",
  optimized: "/assets/sounds/jarvis-fx/optimized.mp3?v=5",
  warning:   "/assets/sounds/jarvis-fx/warning.mp3?v=5",
  critical:  "/assets/sounds/jarvis-fx/critical.mp3?v=5",
  fail:      "/assets/sounds/jarvis-fx/fail.mp3?v=5",
};

const LABELS: Record<JarvisEvent, string> = {
  welcome: "Boot do painel",
  optimized: "Calibração concluída",
  warning: "Carrinho abandonado",
  critical: "Saldo crítico (< R$ 50)",
  fail: "Falha de API / Webhook",
};

const SEVERITY: Record<JarvisEvent, string> = {
  welcome: "info",
  optimized: "success",
  warning: "warning",
  critical: "critical",
  fail: "critical",
};

// ----- Histórico global (in-memory pub/sub para UI viva) -----
export type JarvisHistoryEntry = { id: string; evt: JarvisEvent; label: string; detail?: string; at: string };
const HISTORY: JarvisHistoryEntry[] = [];
const LISTENERS = new Set<() => void>();
const MAX = 50;

function pushHistory(evt: JarvisEvent, detail?: string) {
  HISTORY.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    evt,
    label: LABELS[evt],
    detail,
    at: new Date().toISOString(),
  });
  if (HISTORY.length > MAX) HISTORY.length = MAX;
  LISTENERS.forEach((l) => l());
  // fire-and-forget persistência
  void logJarvisAlert({
    data: {
      severidade: SEVERITY[evt],
      origem: evt,
      mensagem: LABELS[evt],
      detalhe: detail,
    },
  }).catch(() => {});
}

export function useJarvisHistory(): JarvisHistoryEntry[] {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    LISTENERS.add(l);
    return () => { LISTENERS.delete(l); };
  }, []);
  return HISTORY;
}

// ----- Pré-carregamento com new Audio() -----
const audioCache: Partial<Record<JarvisEvent, HTMLAudioElement>> = {};
let preloaded = false;

function preloadAll() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  (Object.keys(SRC) as JarvisEvent[]).forEach((evt) => {
    try {
      const a = new Audio(SRC[evt]);
      a.preload = "auto";
      a.volume = 0.85;
      audioCache[evt] = a;
    } catch {}
  });
}

// ----- Debounce anti-spam (60s) para warning/fail -----
const DEBOUNCE_MS = 60_000;
const DEBOUNCED: Set<JarvisEvent> = new Set(["warning", "fail"]);
const lastPlayedAt: Partial<Record<JarvisEvent, number>> = {};

export function useJarvis(enabled: boolean = true) {
  const firedRef = useRef<Partial<Record<string, boolean>>>({});

  useEffect(() => { if (enabled) preloadAll(); }, [enabled]);

  const play = useCallback((evt: JarvisEvent, detail?: string) => {
    pushHistory(evt, detail);
    if (!enabled) return;
    if (DEBOUNCED.has(evt)) {
      const last = lastPlayedAt[evt] ?? 0;
      if (Date.now() - last < DEBOUNCE_MS) return; // bloqueia som, mantém log
    }
    lastPlayedAt[evt] = Date.now();
    preloadAll();
    const a = audioCache[evt];
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }, [enabled]);

  const playOnce = useCallback((evt: JarvisEvent, key: string, detail?: string) => {
    const k = `${evt}:${key}`;
    if (firedRef.current[k]) return;
    firedRef.current[k] = true;
    play(evt, detail);
  }, [play]);

  return { play, playOnce };
}

export function useJarvisWelcome(enabled: boolean) {
  const { play } = useJarvis(enabled);
  useEffect(() => {
    if (!enabled) return;
    play("welcome");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
