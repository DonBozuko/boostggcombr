import { useState, useCallback } from "react";
import fabiano from "@/assets/fabiano.png.asset.json";
import { User } from "lucide-react";

export type FabianoVariant = "instagram" | "tiktok" | "youtube" | "facebook" | "telegram" | "trafego";

// Build-time validation: VITE_TELEGRAM_BOT_USERNAME pode ser definido no .env do workspace
// para sobrescrever o handle padrão. Se vazio, avisa sem quebrar o caixa.
const DEFAULT_BOT_USERNAME = "boostygram_bot";
const BOT_USERNAME =
  (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.trim() || DEFAULT_BOT_USERNAME;
if (!import.meta.env.VITE_TELEGRAM_BOT_USERNAME && typeof window === "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    `[FabianoBadge] VITE_TELEGRAM_BOT_USERNAME não definido — usando default "${DEFAULT_BOT_USERNAME}".`,
  );
}

const START_PARAM: Record<FabianoVariant, string> = {
  instagram: "ig",
  tiktok: "tk",
  youtube: "yt",
  facebook: "fb",
  telegram: "tg",
  trafego: "tf",
};

function buildLinks(variant: FabianoVariant) {
  const start = START_PARAM[variant];
  if (!BOT_USERNAME) {
    return { native: "https://t.me", web: "https://t.me" };
  }
  return {
    native: `tg://resolve?domain=${BOT_USERNAME}&start=${start}`,
    web: `https://t.me/${BOT_USERNAME}?start=${start}`,
  };
}

const COPY: Record<FabianoVariant, { text: string; accent: string; glow: string; border: string; ring: string; dot: string }> = {
  instagram: {
    text: "Aproveite o Canarinho Ouro! Quer bônus exclusivo? Clique aqui!",
    accent: "text-emerald-400",
    glow: "drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]",
    border: "border-emerald-400/80",
    ring: "shadow-[0_0_24px_rgba(16,185,129,0.55)] ring-emerald-400/20",
    dot: "bg-emerald-400",
  },
  tiktok: {
    text: "O algoritmo está entregando tudo! Clique para destravar combos secretos!",
    accent: "text-[#00f2fe]",
    glow: "drop-shadow-[0_0_6px_rgba(0,242,254,0.8)]",
    border: "border-[#00f2fe]/80",
    ring: "shadow-[0_0_24px_rgba(0,242,254,0.55)] ring-[#00f2fe]/20",
    dot: "bg-[#fe0979]",
  },
  youtube: {
    text: "Quer monetizar mais rápido? Clique e libere o combo Inscritos + Views!",
    accent: "text-red-500",
    glow: "drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]",
    border: "border-red-500/80",
    ring: "shadow-[0_0_24px_rgba(239,68,68,0.55)] ring-red-500/20",
    dot: "bg-red-500",
  },
  facebook: {
    text: "Bora dominar o feed? Clique aqui e fale comigo no privado!",
    accent: "text-[#1877F2]",
    glow: "drop-shadow-[0_0_6px_rgba(24,119,242,0.8)]",
    border: "border-[#1877F2]/80",
    ring: "shadow-[0_0_24px_rgba(24,119,242,0.55)] ring-[#1877F2]/20",
    dot: "bg-[#1877F2]",
  },
  telegram: {
    text: "Vem pro grupo VIP! Clique e receba os pacotes em primeira mão.",
    accent: "text-cyan-300",
    glow: "drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]",
    border: "border-cyan-300/80",
    ring: "shadow-[0_0_24px_rgba(34,211,238,0.55)] ring-cyan-300/20",
    dot: "bg-cyan-300",
  },
  trafego: {
    text: "Tráfego real esperando você. Clique e libere o combo cyberpunk!",
    accent: "text-purple-400",
    glow: "drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]",
    border: "border-purple-400/80",
    ring: "shadow-[0_0_24px_rgba(168,85,247,0.55)] ring-purple-400/20",
    dot: "bg-purple-400",
  },
};

export function FabianoBadge({ variant = "instagram" }: { variant?: FabianoVariant }) {
  const [open, setOpen] = useState(true);
  const [imgOk, setImgOk] = useState(true);
  const c = COPY[variant];
  const { native, web } = buildLinks(variant);

  // Fallback inteligente: tenta tg://, e se em ~600ms a página ainda estiver visível,
  // assume que o app não abriu e redireciona para a web.
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!BOT_USERNAME) return; // sem bot configurado → segue href padrão (https://t.me)
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

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-end gap-3">
      <a
        href={web}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="Fabiano Santiago — Falar no Telegram"
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        className={`relative h-14 w-14 rounded-full overflow-hidden border-2 ${c.border} ${c.ring} ring-2 hover:scale-105 transition-transform`}
      >
        {imgOk ? (
          <img
            src={fabiano.url}
            alt="Fabiano Santiago"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center bg-zinc-800 text-zinc-300">
            <span className="text-sm font-bold tracking-wide">FS</span>
            <User className="absolute h-5 w-5 opacity-0" aria-hidden />
          </div>
        )}
        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${c.dot} border-2 border-black animate-pulse`} />
      </a>
      <a
        href={web}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`relative max-w-[260px] rounded-2xl px-3.5 py-2.5 text-xs leading-snug backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl transition-all duration-300 hover:bg-white/15 hover:scale-[1.02] ${
          open ? "opacity-100 translate-x-0 animate-[fade-in_0.4s_ease-out]" : "opacity-0 -translate-x-2 pointer-events-none"
        }`}
        role="tooltip"
      >
        <span
          className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 bg-white/10 border-l border-b border-white/20"
          aria-hidden
        />
        <div className={`font-semibold ${c.accent} ${c.glow}`}>Fabiano Santiago</div>
        <div className="text-white/95 mt-0.5">{c.text}</div>
        <div className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${c.accent}`}>
          → Falar no Telegram
        </div>
      </a>
    </div>
  );
}
