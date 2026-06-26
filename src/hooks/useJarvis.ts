import { useCallback, useEffect, useRef, useState } from "react";
import { logJarvisAlert } from "@/lib/jarvis.functions";

/**
 * Jarvis Sound System — destravamento por User Gesture (cache v=6).
 * AudioContext + GainNode híbrido para quebrar autoplay e eliminar bipes.
 */
export type JarvisEvent = "welcome" | "optimized" | "warning" | "critical" | "fail";

const SRC: Record<JarvisEvent, string> = {
  welcome:   "/assets/sounds/jarvis-fx/welcome.mp3?v=6",
  optimized: "/assets/sounds/jarvis-fx/optimized.mp3?v=6",
  warning:   "/assets/sounds/jarvis-fx/warning.mp3?v=6",
  critical:  "/assets/sounds/jarvis-fx/critical.mp3?v=6",
  fail:      "/assets/sounds/jarvis-fx/fail.mp3?v=6",
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

// ----- Histórico in-memory (admin) -----
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
  void logJarvisAlert({
    data: { severidade: SEVERITY[evt], origem: evt, mensagem: LABELS[evt], detalhe: detail },
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

// ----- AudioContext + GainNode (destravado via gesto) -----
let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let unlocked = false;
const buffers: Partial<Record<JarvisEvent, AudioBuffer>> = {};

async function decodeAll() {
  if (!audioCtx) return;
  await Promise.all(
    (Object.keys(SRC) as JarvisEvent[]).map(async (evt) => {
      if (buffers[evt]) return;
      try {
        const res = await fetch(SRC[evt]);
        const arr = await res.arrayBuffer();
        buffers[evt] = await audioCtx!.decodeAudioData(arr);
      } catch {}
    }),
  );
}

/** Deve ser chamado DENTRO do handler do clique do usuário. */
export async function unlockJarvis(): Promise<boolean> {
  if (unlocked) return true;
  if (typeof window === "undefined") return false;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.9;
    gainNode.connect(audioCtx.destination);
    if (audioCtx.state === "suspended") await audioCtx.resume();
    // Toque silencioso síncrono para destravar (gesture chain)
    const silent = audioCtx.createBufferSource();
    silent.buffer = audioCtx.createBuffer(1, 1, 22050);
    silent.connect(gainNode);
    silent.start(0);
    unlocked = true;
    void decodeAll();
    return true;
  } catch {
    return false;
  }
}

function playBuffer(evt: JarvisEvent) {
  if (!audioCtx || !gainNode) return;
  const buf = buffers[evt];
  if (!buf) return;
  try {
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(gainNode);
    src.start(0);
  } catch {}
}

// ----- Debounce anti-spam -----
const DEBOUNCE_MS = 60_000;
const DEBOUNCED: Set<JarvisEvent> = new Set(["warning", "fail"]);
const lastPlayedAt: Partial<Record<JarvisEvent, number>> = {};

export function useJarvis(enabled: boolean = true) {
  const firedRef = useRef<Partial<Record<string, boolean>>>({});

  const play = useCallback((evt: JarvisEvent, detail?: string) => {
    pushHistory(evt, detail);
    if (!enabled || !unlocked) return;
    if (DEBOUNCED.has(evt)) {
      const last = lastPlayedAt[evt] ?? 0;
      if (Date.now() - last < DEBOUNCE_MS) return;
    }
    lastPlayedAt[evt] = Date.now();
    // Se ainda não tem o buffer decodificado, tenta carregar e tocar
    if (!buffers[evt]) {
      void decodeAll().then(() => playBuffer(evt));
      return;
    }
    playBuffer(evt);
  }, [enabled]);

  const playOnce = useCallback((evt: JarvisEvent, key: string, detail?: string) => {
    const k = `${evt}:${key}`;
    if (firedRef.current[k]) return;
    firedRef.current[k] = true;
    play(evt, detail);
  }, [play]);

  return { play, playOnce, unlock: unlockJarvis, isUnlocked: () => unlocked };
}

export function useJarvisWelcome(enabled: boolean) {
  const { play } = useJarvis(enabled);
  useEffect(() => {
    if (!enabled) return;
    play("welcome");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
