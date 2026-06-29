import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Instagram, Music2, Youtube, Facebook, Globe2 } from "lucide-react";
import type { FabianoVariant } from "./FabianoBadge";
import { registerJarvisAudio, stopAllJarvis } from "@/hooks/useJarvis";

const WELCOME_SRC = "/api/public/sfx/welcome.mp3?v=38";

const COMFORT_LINE =
  "Senhor, se a imponência da minha lâmina de plasma estiver obstruindo a sua visão dos pacotes de lucro, sinta-se à vontade para tocar no botão de ativação no cabo. Eu recolherei a armadura imediatamente para o seu total conforto de navegação.";

const NAV_ITEMS: Array<{ to: string; label: string; Icon: typeof Instagram }> = [
  { to: "/",         label: "Instagram", Icon: Instagram },
  { to: "/tiktok",   label: "TikTok",    Icon: Music2 },
  { to: "/youtube",  label: "YouTube",   Icon: Youtube },
  { to: "/facebook", label: "Facebook",  Icon: Facebook },
  { to: "/trafego",  label: "Tráfego",   Icon: Globe2 },
];

export function JarvisBladeBadge({ variant = "instagram" }: { variant?: FabianoVariant }) {
  void variant;
  const [raised, setRaised] = useState(false); // false = blade down, true = retracted up
  const fired = useRef(false);
  const comfortTimer = useRef<number | null>(null);
  const interactedRef = useRef(false);

  // Welcome audio dispara ao final da animação de descida (1s).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      try {
        stopAllJarvis();
        const a = new Audio(WELCOME_SRC);
        a.crossOrigin = "anonymous";
        a.volume = 0.95;
        const unreg = registerJarvisAudio(a);
        a.onended = () => unreg();
        a.play().catch(() => unreg());
      } catch {}
    }, 1000);
    return () => window.clearTimeout(t);
  }, []);

  // Linha de conforto aos 5s caso o usuário não interaja.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const markInteract = () => { interactedRef.current = true; };
    const evs: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "wheel", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, markInteract, { passive: true, once: true } as AddEventListenerOptions));
    comfortTimer.current = window.setTimeout(() => {
      if (interactedRef.current) return;
      try {
        const synth = window.speechSynthesis;
        if (!synth) return;
        const u = new SpeechSynthesisUtterance(COMFORT_LINE);
        u.lang = "pt-BR";
        u.rate = 0.96;
        u.pitch = 0.85;
        u.volume = 0.95;
        const voices = synth.getVoices();
        const pt = voices.find((v) => /pt[-_]BR/i.test(v.lang)) || voices.find((v) => /pt/i.test(v.lang));
        if (pt) u.voice = pt;
        synth.cancel();
        synth.speak(u);
      } catch {}
    }, 5000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, markInteract as EventListener));
      if (comfortTimer.current) window.clearTimeout(comfortTimer.current);
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  const onToggle = () => {
    interactedRef.current = true;
    setRaised((r) => !r);
  };

  return (
    <>
      <style>{`
        @keyframes blade-lower { from { transform: rotate(-105deg); } to { transform: rotate(-18deg); } }
        @keyframes blade-glow  { 0%,100% { filter: drop-shadow(0 0 6px #67e8f9) drop-shadow(0 0 14px #22d3ee); }
                                  50%   { filter: drop-shadow(0 0 12px #a5f3fc) drop-shadow(0 0 26px #06b6d4); } }
        @keyframes reactor-pulse { 0%,100% { box-shadow: 0 0 8px #22d3ee, 0 0 16px #0891b2 inset; }
                                   50%    { box-shadow: 0 0 16px #67e8f9, 0 0 22px #22d3ee inset; } }
        .blade-arm        { transform-origin: 18px 18px; animation: blade-lower 1s cubic-bezier(.22,1,.36,1) both; }
        .blade-arm.raised { transform: rotate(-105deg); transition: transform .85s cubic-bezier(.22,1,.36,1); }
        .blade-arm.lowered{ transform: rotate(-18deg);  transition: transform .85s cubic-bezier(.22,1,.36,1); animation: none; }
        .blade-glow       { animation: blade-glow 2.4s ease-in-out infinite; }
        .reactor-btn      { animation: reactor-pulse 1.6s ease-in-out infinite; }
      `}</style>
      <div
        aria-label="J.A.R.V.I.S. — Espada Omnichannel"
        className="fixed top-2 z-40 pointer-events-none"
        style={{ left: "max(4px, calc(50% - 240px))", width: 300, height: 440 }}
      >
        <svg viewBox="0 0 300 440" className="absolute inset-0 w-full h-full overflow-visible">
          <defs>
            <linearGradient id="plasmaG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="#ffffff" stopOpacity="1"/>
              <stop offset="40%" stopColor="#a5f3fc" stopOpacity="1"/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity=".9"/>
            </linearGradient>
            <linearGradient id="hiltG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#27272a"/>
              <stop offset="50%" stopColor="#52525b"/>
              <stop offset="100%" stopColor="#18181b"/>
            </linearGradient>
            <linearGradient id="armG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#1f2937"/>
              <stop offset="100%" stopColor="#0a0a0a"/>
            </linearGradient>
          </defs>

          {/* Ombro/articulação fixa */}
          <circle cx="18" cy="18" r="14" fill="url(#armG)" stroke="#3f3f46" strokeWidth="1.5"/>
          <circle cx="18" cy="18" r="5" fill="#22d3ee" opacity=".9"/>

          {/* Braço articulável — rotaciona em torno do ombro */}
          <g className={`blade-arm ${raised ? "raised" : "lowered"}`}>
            {/* Antebraço */}
            <rect x="14" y="18" width="14" height="120" rx="6" fill="url(#armG)" stroke="#3f3f46" strokeWidth="1"/>
            {/* Punho/luva */}
            <rect x="10" y="132" width="22" height="18" rx="4" fill="#27272a" stroke="#52525b"/>
            {/* Cabo (hilt) */}
            <rect x="14" y="150" width="14" height="44" rx="3" fill="url(#hiltG)" stroke="#3f3f46"/>
            <rect x="13" y="160" width="16" height="2" fill="#a1a1aa"/>
            <rect x="13" y="172" width="16" height="2" fill="#a1a1aa"/>
            <rect x="13" y="184" width="16" height="2" fill="#a1a1aa"/>
            {/* Guarda */}
            <rect x="6" y="192" width="30" height="6" rx="2" fill="#71717a" stroke="#3f3f46"/>
            {/* Lâmina de plasma */}
            <g className="blade-glow">
              <rect x="17" y="198" width="8" height="230" rx="4" fill="url(#plasmaG)"/>
              <rect x="19" y="200" width="4" height="226" rx="2" fill="#ffffff" opacity=".85"/>
              <polygon points="17,428 25,428 21,440" fill="#a5f3fc"/>
            </g>
          </g>
        </svg>

        {/* Botão reator no cabo — segue o ângulo do braço via mesma rotação */}
        <div
          className={`absolute pointer-events-auto`}
          style={{
            left: 18, top: 18,
            transformOrigin: "0 0",
            transform: raised ? "rotate(-105deg)" : "rotate(-18deg)",
            transition: "transform .85s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {/* Reator-botão posicionado na base do cabo (~y=170 no braço) */}
          <button
            type="button"
            onClick={onToggle}
            aria-label={raised ? "Descer espada" : "Recolher espada"}
            className="reactor-btn absolute grid place-items-center rounded-full bg-cyan-400/90 hover:bg-cyan-300 text-black font-black text-[10px] border-2 border-cyan-100"
            style={{ left: 9, top: 162, width: 24, height: 24 }}
          >
            {raised ? "▼" : "▲"}
          </button>

          {/* Ícones omnichannel cravados na lâmina */}
          {NAV_ITEMS.map((item, i) => {
            const top = 215 + i * 38; // espalha ao longo da lâmina
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className="absolute pointer-events-auto grid place-items-center rounded-full bg-black/70 backdrop-blur-sm border border-cyan-300/80 text-cyan-100 hover:bg-cyan-400 hover:text-black transition-colors shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                style={{ left: 7, top, width: 28, height: 28 }}
              >
                <item.Icon className="h-3.5 w-3.5" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
