import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import fabiano from "@/assets/fabiano.webp";

export type FabianoVariant = "instagram" | "tiktok" | "youtube" | "facebook" | "telegram" | "trafego" | "kwai";

const DEFAULT_BOT_USERNAME = "Boostgg_bot";
const BOT_USERNAME =
  (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.trim() || DEFAULT_BOT_USERNAME;

const START_PARAM: Record<FabianoVariant, string> = {
  instagram: "ig", tiktok: "tk", youtube: "yt", facebook: "fb", telegram: "tg", trafego: "tf", kwai: "kw",
};

function buildLinks(variant: FabianoVariant) {
  const start = START_PARAM[variant];
  if (!BOT_USERNAME) return { native: "https://t.me", web: "https://t.me" };
  return {
    native: `tg://resolve?domain=${BOT_USERNAME}&start=${start}`,
    web: `https://t.me/${BOT_USERNAME}?start=${start}`,
  };
}

type Skin = { accent: string; border: string; ring: string; dot: string };
const SKINS: Record<FabianoVariant, Skin> = {
  instagram: { accent: "text-emerald-400", border: "border-emerald-400/80", ring: "shadow-[0_0_24px_rgba(16,185,129,0.55)] ring-emerald-400/20", dot: "bg-emerald-400" },
  tiktok:    { accent: "text-[#00f2fe]",   border: "border-[#00f2fe]/80",   ring: "shadow-[0_0_24px_rgba(0,242,254,0.55)] ring-[#00f2fe]/20",  dot: "bg-[#fe0979]" },
  youtube:   { accent: "text-red-500",     border: "border-red-500/80",     ring: "shadow-[0_0_24px_rgba(239,68,68,0.55)] ring-red-500/20",   dot: "bg-red-500" },
  facebook:  { accent: "text-[#1877F2]",   border: "border-[#1877F2]/80",   ring: "shadow-[0_0_24px_rgba(24,119,242,0.55)] ring-[#1877F2]/20", dot: "bg-[#1877F2]" },
  telegram:  { accent: "text-cyan-300",    border: "border-cyan-300/80",    ring: "shadow-[0_0_24px_rgba(34,211,238,0.55)] ring-cyan-300/20",  dot: "bg-cyan-300" },
  trafego:   { accent: "text-purple-400",  border: "border-purple-400/80",  ring: "shadow-[0_0_24px_rgba(168,85,247,0.55)] ring-purple-400/20", dot: "bg-purple-400" },
  kwai:      { accent: "text-orange-400",  border: "border-orange-400/80",  ring: "shadow-[0_0_24px_rgba(251,146,60,0.55)] ring-orange-400/20", dot: "bg-orange-400" },
};

export function FabianoBadge({ variant = "instagram", inline = false }: { variant?: FabianoVariant; inline?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [hudMode, setHudMode] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const c = SKINS[variant];
  const { native, web } = buildLinks(variant);

  useEffect(() => {
    setMounted(true);
    const t = window.setTimeout(() => setHudMode(true), 3000);
    return () => window.clearTimeout(t);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      try {
        if (typeof window !== "undefined" && window.openSupportChat?.()) {
          e.preventDefault();
          return;
        }
      } catch { /* fallback Telegram */ }
      if (!BOT_USERNAME) return;
      e.preventDefault();
      const start = Date.now();
      const timer = window.setTimeout(() => {
        if (Date.now() - start < 1600 && document.visibilityState === "visible") {
          window.open(web, "_blank", "noopener,noreferrer");
        }
      }, 600);
      const onHide = () => {
        window.clearTimeout(timer);
        document.removeEventListener("visibilitychange", onHide);
      };
      document.addEventListener("visibilitychange", onHide);
      window.location.href = native;
    },
    [native, web],
  );

  const badge = (
    <div
      className={inline
        ? "relative z-[40] inline-flex flex-col items-center pointer-events-auto"
        : "fixed z-[80] flex flex-col items-center pointer-events-auto"}
      style={inline ? undefined : { left: "max(8px, calc(50vw - 225px + 8px))", top: "max(300px, calc(env(safe-area-inset-top, 0px) + 30vh))" }}
    >
      <a
        href={web}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="Fabiano Santiago — Falar no Telegram"
        className={`relative h-16 w-16 rounded-full overflow-hidden border-2 ${c.border} ${c.ring} ring-2 bg-black hover:scale-105 transition-transform`}
      >
        {imgOk ? (
          <img
            src={fabiano}
            alt="Fabiano Santiago"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-zinc-800 text-zinc-300">
            <span className="text-sm font-bold tracking-wide">FS</span>
          </div>
        )}
        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${c.dot} border-2 border-black`} />
      </a>

      {hudMode && (
        <a
          href={web}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          aria-label="Fale comigo no Telegram"
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide text-white border ${c.border} bg-black/80 backdrop-blur-md ${c.ring} ring-1 animate-fade-in hover:scale-105 transition-transform ${c.accent}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
          Fale Comigo
        </a>
      )}
    </div>
  );

  if (inline) return badge;
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(badge, document.body);
}
