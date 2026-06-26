import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Jarvis Sound System — decodificação via AudioContext (fim dos bipes).
 * Cache-buster v=4. Falha silenciosa se mp3 ausente.
 */
export type JarvisEvent = "welcome" | "optimized" | "warning" | "critical" | "fail";

const SRC: Record<JarvisEvent, string> = {
  welcome:   "/assets/sounds/jarvis-fx/welcome.mp3?v=4",
  optimized: "/assets/sounds/jarvis-fx/optimized.mp3?v=4",
  warning:   "/assets/sounds/jarvis-fx/warning.mp3?v=4",
  critical:  "/assets/sounds/jarvis-fx/critical.mp3?v=4",
  fail:      "/assets/sounds/jarvis-fx/fail.mp3?v=4",
};

const LABELS: Record<JarvisEvent, string> = {
  welcome: "Boot do painel",
  optimized: "Calibração concluída",
  warning: "Carrinho abandonado",
  critical: "Saldo crítico (< R$ 50)",
  fail: "Falha de API / Webhook",
};

// ----- Histórico global de alertas (in-memory, com pub/sub) -----
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

// ----- AudioContext singleton + buffer cache -----
let ctx: AudioContext | null = null;
const buffers: Partial<Record<JarvisEvent, AudioBuffer | null>> = {};
const loading: Partial<Record<JarvisEvent, Promise<AudioBuffer | null>>> = {};

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

async function loadBuffer(evt: JarvisEvent): Promise<AudioBuffer | null> {
  if (buffers[evt] !== undefined) return buffers[evt] ?? null;
  if (loading[evt]) return loading[evt]!;
  const c = getCtx();
  if (!c) return null;
  loading[evt] = (async () => {
    try {
      const res = await fetch(SRC[evt], { cache: "reload" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const decoded = await c.decodeAudioData(buf);
      buffers[evt] = decoded;
      return decoded;
    } catch {
      buffers[evt] = null;
      return null;
    } finally {
      delete loading[evt];
    }
  })();
  return loading[evt]!;
}

export function useJarvis(enabled: boolean = true) {
  const firedRef = useRef<Partial<Record<string, boolean>>>({});

  const play = useCallback((evt: JarvisEvent, detail?: string) => {
    pushHistory(evt, detail);
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    loadBuffer(evt).then((decoded) => {
      if (!decoded) return;
      try {
        const src = c.createBufferSource();
        src.buffer = decoded;
        const gain = c.createGain();
        gain.gain.value = 0.8;
        src.connect(gain).connect(c.destination);
        src.start(0);
      } catch {}
    });
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
