import { useCallback, useEffect, useRef, useState } from "react";
import { logJarvisAlert } from "@/lib/jarvis.functions";

/**
 * Jarvis Sound System — native <audio> + cache v=18.
 * MIME audio/mpeg lido direto pelo browser, sem decode manual = fim do bipe.
 * Destravado obrigatoriamente por gesto do usuário (botão Som LIGADO).
 */
export type JarvisEvent = "welcome" | "optimized" | "warning" | "critical" | "fail";

const SRC: Record<JarvisEvent, string> = {
  welcome:   "/api/public/sfx/welcome.mp3?v=26",
  optimized: "/api/public/sfx/optimized.mp3?v=26",
  warning:   "/api/public/sfx/warning.mp3?v=26",
  critical:  "/api/public/sfx/critical.mp3?v=26",
  fail:      "/api/public/sfx/fail.mp3?v=26",
};


export const SUBTITLES: Record<JarvisEvent, string> = {
  welcome: "Bem-vindo de volta, comandante. Painel EliteBoost Prime online.",
  optimized: "Calibração concluída. Sistemas operando em performance máxima.",
  warning: "Alerta: carrinho abandonado detectado no funil.",
  critical: "Atenção crítica: saldo do fornecedor abaixo de cinquenta reais.",
  fail: "Falha de API detectada. Iniciando diagnóstico imediato.",
};

let subtitle: string | null = null;
const SUB_LISTENERS = new Set<(s: string | null) => void>();
function setSubtitle(s: string | null) {
  subtitle = s;
  SUB_LISTENERS.forEach((l) => l(s));
}
export function useJarvisSubtitle(): string | null {
  const [s, setS] = useState<string | null>(subtitle);
  useEffect(() => {
    SUB_LISTENERS.add(setS);
    return () => { SUB_LISTENERS.delete(setS); };
  }, []);
  return s;
}


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

// ----- Native <audio> pool -----
const pool: Partial<Record<JarvisEvent, HTMLAudioElement>> = {};
let unlocked = false;

function makeAudio(evt: JarvisEvent): HTMLAudioElement {
  const a = new Audio(SRC[evt]);
  a.crossOrigin = "anonymous";
  a.preload = "auto";
  a.volume = 1.0;
  return a;
}


/** DEVE ser chamado DENTRO do handler de clique do usuário. */
export async function unlockJarvis(): Promise<boolean> {
  if (unlocked) return true;
  if (typeof window === "undefined") return false;
  try {
    // Pré-carrega + destrava cada elemento com play()/pause() dentro do gesto.
    await Promise.all(
      (Object.keys(SRC) as JarvisEvent[]).map(async (evt) => {
        const a = makeAudio(evt);
        pool[evt] = a;
        try {
          a.muted = true;
          await a.play();
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        } catch {
          // ok — destrava no primeiro play real
        }
      }),
    );
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

function playNative(evt: JarvisEvent) {
  let a = pool[evt];
  if (!a) {
    a = makeAudio(evt);
    pool[evt] = a;
  }
  try {
    a.pause();
    a.currentTime = 0;
    setSubtitle(SUBTITLES[evt]);
    const clear = () => setSubtitle(null);
    a.onended = clear;
    a.onerror = clear;
    void a.play().catch(() => setSubtitle(null));
    // Fallback fade-out caso onended não dispare
    window.setTimeout(() => { if (subtitle === SUBTITLES[evt]) setSubtitle(null); }, 8000);
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
    playNative(evt);
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
