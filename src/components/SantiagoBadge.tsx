import { useState, useCallback } from "react";
import santiago from "@/assets/santiago.png.asset.json";
import { X } from "lucide-react";
import type { FabianoVariant } from "./FabianoBadge";

const DEFAULT_BOT_USERNAME = "boostgramseguidores_bot";
const BOT_USERNAME =
  (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.trim() || DEFAULT_BOT_USERNAME;

const START_PARAM: Record<FabianoVariant, string> = {
  instagram: "ig", tiktok: "tk", youtube: "yt", facebook: "fb", telegram: "tg", trafego: "tf",
};

const ACCENT: Record<FabianoVariant, { border: string; ring: string; accent: string; glow: string; dot: string }> = {
  instagram: { border: "border-fuchsia-400/80", ring: "shadow-[0_0_24px_rgba(217,70,239,0.55)] ring-fuchsia-400/20", accent: "text-fuchsia-300", glow: "drop-shadow-[0_0_6px_rgba(217,70,239,0.8)]", dot: "bg-fuchsia-400" },
  tiktok:    { border: "border-[#00f2fe]/80",   ring: "shadow-[0_0_24px_rgba(0,242,254,0.55)] ring-[#00f2fe]/20",   accent: "text-[#00f2fe]",   glow: "drop-shadow-[0_0_6px_rgba(0,242,254,0.8)]",  dot: "bg-[#fe0979]" },
  youtube:   { border: "border-red-500/80",     ring: "shadow-[0_0_24px_rgba(239,68,68,0.55)] ring-red-500/20",     accent: "text-red-500",     glow: "drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]",  dot: "bg-red-500" },
  facebook:  { border: "border-[#1877F2]/80",   ring: "shadow-[0_0_24px_rgba(24,119,242,0.55)] ring-[#1877F2]/20",  accent: "text-[#1877F2]",   glow: "drop-shadow-[0_0_6px_rgba(24,119,242,0.8)]", dot: "bg-[#1877F2]" },
  telegram:  { border: "border-cyan-300/80",    ring: "shadow-[0_0_24px_rgba(34,211,238,0.55)] ring-cyan-300/20",   accent: "text-cyan-300",    glow: "drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]", dot: "bg-cyan-300" },
  trafego:   { border: "border-purple-400/80",  ring: "shadow-[0_0_24px_rgba(168,85,247,0.55)] ring-purple-400/20", accent: "text-purple-400",  glow: "drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]", dot: "bg-purple-400" },
};

const SPEECH =
  "Quer destravar vendas e bombar seu perfil com o algoritmo hoje? Me chama no Telegram que te entrego um cupom secreto! ⚡";

export function SantiagoBadge({ variant = "instagram" }: { variant?: FabianoVariant }) {
  const [open, setOpen] = useState(true);
  const c = ACCENT[variant];
  const web = `https://t.me/${BOT_USERNAME}?start=${START_PARAM[variant]}`;
  const native = `tg://resolve?domain=${BOT_USERNAME}&start=${START_PARAM[variant]}`;

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const start = Date.now();
    const timer = window.setTimeout(() => {
      if (Date.now() - start < 1600 && document.visibilityState === "visible") {
        window.open(web, "_blank", "noopener,noreferrer");
      }
    }, 600);
    const onHide = () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", onHide); };
    document.addEventListener("visibilitychange", onHide);
    window.location.href = native;
  }, [native, web]);

  return (
    <div className="fixed top-2 z-40 flex flex-col items-end gap-1" style={{ right: "max(8px, calc(50% - 225px))" }}>
      <a
        href={web}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Diretor Santiago — Telegram"
        className={`relative h-16 w-16 rounded-full overflow-hidden border-2 ${c.border} ${c.ring} ring-2 hover:scale-105 transition-transform`}
      >
        <img src={santiago.url} alt="Diretor Santiago" className="h-full w-full object-cover" loading="lazy" />
        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${c.dot} border-2 border-black animate-pulse`} />
      </a>
      {open && (
        <div
          role="status"
          aria-live="polite"
          className={`relative max-w-[204px] sm:max-w-[221px] rounded-2xl px-3 py-2 pr-7 text-[11px] leading-snug backdrop-blur-xl bg-black/40 border ${c.border} shadow-2xl`}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
            className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
          <div className={`font-semibold ${c.accent} ${c.glow}`}>Diretor Santiago</div>
          <div className="text-white/95 mt-0.5">{SPEECH}</div>
        </div>
      )}
    </div>
  );
}
