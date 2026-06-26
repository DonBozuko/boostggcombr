import { useEffect, useRef, useState } from "react";
import type { FabianoVariant } from "./FabianoBadge";

const SPEECH =
  "Diretor Fabiano, os parâmetros de engajamento da EliteBoost Prime foram elevados ao nível máximo. Os servidores de entrega imediata estão prontos para alavancar este cliente. É impressionante a eficiência da sua rede, senhor!";

const AUDIO_SRC = "/api/public/sfx/jarvis-interacao.mp3?v=25";

const THEME: Record<FabianoVariant, { ring: string; border: string; accent: string; glow: string; dot: string }> = {
  instagram: { ring: "shadow-[0_0_24px_rgba(34,211,238,0.65)] ring-cyan-300/30", border: "border-cyan-300/80", accent: "text-cyan-300", glow: "drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]", dot: "bg-cyan-300" },
  tiktok:    { ring: "shadow-[0_0_24px_rgba(0,242,254,0.65)] ring-[#00f2fe]/30",  border: "border-[#00f2fe]/80",  accent: "text-[#00f2fe]",  glow: "drop-shadow-[0_0_6px_rgba(0,242,254,0.9)]",  dot: "bg-[#00f2fe]" },
  youtube:   { ring: "shadow-[0_0_24px_rgba(255,0,40,0.7)] ring-red-500/30",       border: "border-red-500/80",    accent: "text-red-400",    glow: "drop-shadow-[0_0_6px_rgba(255,0,40,0.9)]",   dot: "bg-red-500" },
  facebook:  { ring: "shadow-[0_0_24px_rgba(24,119,242,0.65)] ring-[#1877F2]/30",  border: "border-[#1877F2]/80",  accent: "text-[#1877F2]",  glow: "drop-shadow-[0_0_6px_rgba(24,119,242,0.9)]", dot: "bg-[#1877F2]" },
  telegram:  { ring: "shadow-[0_0_24px_rgba(34,211,238,0.65)] ring-cyan-300/30",   border: "border-cyan-300/80",   accent: "text-cyan-300",   glow: "drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]", dot: "bg-cyan-300" },
  trafego:   { ring: "shadow-[0_0_24px_rgba(168,85,247,0.65)] ring-purple-400/30", border: "border-purple-400/80", accent: "text-purple-300", glow: "drop-shadow-[0_0_6px_rgba(168,85,247,0.9)]", dot: "bg-purple-400" },
};

export function JarvisBadge({ variant = "instagram" }: { variant?: FabianoVariant }) {
  const t = THEME[variant as FabianoVariant] ?? THEME.instagram;
  const [open, setOpen] = useState(false);
  const firedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio(AUDIO_SRC);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = 0.95;
    audioRef.current = audio;

    const speak = () => {
      try {
        const synth = window.speechSynthesis;
        if (!synth) return;
        const u = new SpeechSynthesisUtterance(SPEECH);
        u.lang = "pt-BR";
        u.rate = 1;
        u.pitch = 1.05;
        const voices = synth.getVoices();
        const pt = voices.find((v) => /pt[-_]BR/i.test(v.lang)) || voices.find((v) => /^pt/i.test(v.lang));
        if (pt) u.voice = pt;
        u.onend = () => setOpen(false);
        synth.cancel();
        synth.speak(u);
      } catch {
        window.setTimeout(() => setOpen(false), 12000);
      }
    };

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setOpen(true);
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            audio.onended = () => setOpen(false);
            audio.onerror = () => speak();
            // If the asset is missing/empty, fall back to TTS after a short check
            window.setTimeout(() => {
              if (audio.paused && audio.currentTime === 0) speak();
            }, 600);
          })
          .catch(() => speak());
      } else {
        speak();
      }
      cleanup();
    };

    const events: Array<keyof WindowEventMap> = ["touchstart", "pointerdown", "scroll", "keydown", "wheel"];
    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, fire as EventListener));
    };
    events.forEach((e) => window.addEventListener(e, fire as EventListener, { passive: true, once: true } as AddEventListenerOptions));
    return cleanup;
  }, []);

  return (
    <div className="fixed bottom-20 right-5 z-50 flex items-end gap-3 flex-row-reverse">
      <div
        aria-label="J.A.R.V.I.S."
        className={`relative h-14 w-14 rounded-full overflow-hidden border-2 ${t.border} ${t.ring} ring-2 bg-black grid place-items-center animate-pulse`}
      >
        <svg viewBox="0 0 64 64" className={`h-9 w-9 ${t.accent} ${t.glow}`} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="32" cy="32" r="26" opacity="0.6" />
          <circle cx="32" cy="32" r="18" opacity="0.85" />
          <circle cx="32" cy="32" r="6" fill="currentColor" />
          <path d="M6 32h10M48 32h10M32 6v10M32 48v10" />
        </svg>
        <span className={`absolute bottom-0 left-0 h-3 w-3 rounded-full ${t.dot} border-2 border-black animate-pulse`} />
      </div>
      <div
        role="status"
        aria-live="polite"
        className={`relative max-w-[260px] rounded-2xl px-3.5 py-2.5 text-xs leading-snug backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl transition-all duration-500 ease-out ${
          open ? "opacity-100 translate-x-0 scale-100 animate-[fade-in_0.4s_ease-out]" : "opacity-0 translate-x-2 scale-90 pointer-events-none"
        }`}
      >
        <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 bg-white/10 border-r border-b border-white/20" aria-hidden />
        <div className={`font-semibold ${t.accent} ${t.glow}`}>J.A.R.V.I.S.</div>
        <div className="text-white/95 mt-0.5">{SPEECH}</div>
      </div>
    </div>
  );
}

