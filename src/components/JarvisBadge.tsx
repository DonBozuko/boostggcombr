import { useEffect, useRef, useState } from "react";
import type { FabianoVariant } from "./FabianoBadge";
import jarvisHud from "@/assets/jarvis-hud.png";

const SPEECH =
  "Diretor Fabiano, os parâmetros de engajamento da EliteBoost Prime foram elevados ao nível máximo. Os servidores de entrega imediata estão prontos para alavancar este cliente. É impressionante a eficiência da sua rede, senhor!";

const AUDIO_SRC = "/api/public/sfx/jarvis-interacao.mp3?v=27";
const AUTO_FIRE_MS = 2000;

// Red Neon HUD — idêntico ao plano de fundo do /admin
const RED = {
  ring: "shadow-[0_0_28px_rgba(255,0,40,0.85)] ring-red-500/40",
  border: "border-red-500/90",
  accent: "text-red-400",
  glow: "drop-shadow-[0_0_8px_rgba(255,0,40,1)]",
  dot: "bg-red-500",
};

export function JarvisBadge({ variant: _variant = "instagram" }: { variant?: FabianoVariant }) {
  const t = RED;
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

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setOpen(true);
      audio.onended = () => setOpen(false);
      // SEM fallback de voz do navegador — apenas o MP3 local oficial.
      audio.onerror = () => {
        // mantém balão por ~12s mesmo se o áudio falhar, sem usar speechSynthesis
        window.setTimeout(() => setOpen(false), 12000);
      };
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // bloqueado pelo navegador — destrava no próximo gesto
          firedRef.current = false;
          setOpen(false);
        });
      }
      cleanup();
    };

    // Disparo automático em 2s
    const timer = window.setTimeout(fire, AUTO_FIRE_MS);

    // Redundância mobile: primeiro gesto destrava se o autoplay for bloqueado
    const events: Array<keyof WindowEventMap> = ["touchstart", "pointerdown", "scroll", "keydown", "wheel"];
    const cleanup = () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, fire as EventListener));
    };
    events.forEach((e) =>
      window.addEventListener(e, fire as EventListener, { passive: true, once: true } as AddEventListenerOptions),
    );
    return cleanup;
  }, []);

  return (
    <div className="fixed bottom-40 right-4 sm:bottom-20 sm:right-5 z-50 flex items-end gap-3 flex-row-reverse">
      <div
        aria-label="J.A.R.V.I.S."
        className={`relative h-16 w-16 rounded-full overflow-hidden border-2 ${t.border} ${t.ring} ring-2 bg-black animate-pulse`}
      >
        <img
          src={jarvisHud}
          alt="J.A.R.V.I.S."
          className={`h-full w-full object-cover ${t.glow}`}
          draggable={false}
        />
        <span className={`absolute bottom-0 left-0 h-3 w-3 rounded-full ${t.dot} border-2 border-black animate-pulse`} />
      </div>
      <div
        role="status"
        aria-live="polite"
        className={`relative max-w-[240px] sm:max-w-[260px] rounded-2xl px-3.5 py-2.5 text-xs leading-snug backdrop-blur-xl bg-red-950/30 border border-red-500/40 shadow-2xl transition-all duration-500 ease-out ${
          open ? "opacity-100 translate-x-0 scale-100 animate-[fade-in_0.4s_ease-out]" : "opacity-0 translate-x-2 scale-90 pointer-events-none"
        }`}
      >
        <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 bg-red-950/30 border-r border-b border-red-500/40" aria-hidden />
        <div className={`font-semibold ${t.accent} ${t.glow}`}>J.A.R.V.I.S.</div>
        <div className="text-white/95 mt-0.5">{SPEECH}</div>
      </div>
    </div>
  );
}
