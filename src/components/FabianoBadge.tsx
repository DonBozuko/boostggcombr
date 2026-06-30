import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import fabiano from "@/assets/fabiano.png.asset.json";
import { User, X } from "lucide-react";

import { useScrolledPercent } from "@/hooks/useScroll";

export type FabianoVariant = "instagram" | "tiktok" | "youtube" | "facebook" | "telegram" | "trafego";

// Build-time validation: VITE_TELEGRAM_BOT_USERNAME pode ser definido no .env do workspace
// para sobrescrever o handle padrão. Se vazio, avisa sem quebrar o caixa.
const DEFAULT_BOT_USERNAME = "boostgramseguidores_bot";
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
    text: "Quer destravar vendas e bombar seu perfil com o algoritmo hoje? Me chama no Telegram que te entrego um cupom secreto! ⚡",
    accent: "text-emerald-400",
    glow: "drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]",
    border: "border-emerald-400/80",
    ring: "shadow-[0_0_24px_rgba(16,185,129,0.55)] ring-emerald-400/20",
    dot: "bg-emerald-400",
  },
  tiktok: {
    text: "Quer destravar vendas e bombar seu perfil com o algoritmo hoje? Me chama no Telegram que te entrego um cupom secreto! ⚡",
    accent: "text-[#00f2fe]",
    glow: "drop-shadow-[0_0_6px_rgba(0,242,254,0.8)]",
    border: "border-[#00f2fe]/80",
    ring: "shadow-[0_0_24px_rgba(0,242,254,0.55)] ring-[#00f2fe]/20",
    dot: "bg-[#fe0979]",
  },
  youtube: {
    text: "Quer destravar vendas e bombar seu perfil com o algoritmo hoje? Me chama no Telegram que te entrego um cupom secreto! ⚡",
    accent: "text-red-500",
    glow: "drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]",
    border: "border-red-500/80",
    ring: "shadow-[0_0_24px_rgba(239,68,68,0.55)] ring-red-500/20",
    dot: "bg-red-500",
  },
  facebook: {
    text: "Quer destravar vendas e bombar seu perfil com o algoritmo hoje? Me chama no Telegram que te entrego um cupom secreto! ⚡",
    accent: "text-[#1877F2]",
    glow: "drop-shadow-[0_0_6px_rgba(24,119,242,0.8)]",
    border: "border-[#1877F2]/80",
    ring: "shadow-[0_0_24px_rgba(24,119,242,0.55)] ring-[#1877F2]/20",
    dot: "bg-[#1877F2]",
  },
  telegram: {
    text: "Quer destravar vendas e bombar seu perfil com o algoritmo hoje? Me chama no Telegram que te entrego um cupom secreto! ⚡",
    accent: "text-cyan-300",
    glow: "drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]",
    border: "border-cyan-300/80",
    ring: "shadow-[0_0_24px_rgba(34,211,238,0.55)] ring-cyan-300/20",
    dot: "bg-cyan-300",
  },
  trafego: {
    text: "Quer destravar vendas e bombar seu perfil com o algoritmo hoje? Me chama no Telegram que te entrego um cupom secreto! ⚡",
    accent: "text-purple-400",
    glow: "drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]",
    border: "border-purple-400/80",
    ring: "shadow-[0_0_24px_rgba(168,85,247,0.55)] ring-purple-400/20",
    dot: "bg-purple-400",
  },
};

export function FabianoBadge({ variant = "instagram", inline = false }: { variant?: FabianoVariant; inline?: boolean }) {
  useScrolledPercent(0.15);
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [hudMode, setHudMode] = useState(false);

  const [imgOk, setImgOk] = useState(true);
  const c = COPY[variant];
  const { native, web } = buildLinks(variant);

  useEffect(() => {
    setMounted(true);
    const t = window.setTimeout(() => { setOpen(false); setHudMode(true); }, 3000);
    return () => window.clearTimeout(t);
  }, []);


  // Fallback inteligente: tenta tg://, e se em ~600ms a página ainda estiver visível,
  // assume que o app não abriu e redireciona para a web.
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Prioridade v46: tentar chat nativo (Jivo) com trava try/catch.
      // Qualquer falha → fallback instantâneo para Telegram, sem tela branca.
      try {
        if (typeof window !== "undefined" && window.openSupportChat?.()) {
          e.preventDefault();
          return;
        }
      } catch { /* chat externo offline → segue para fallback Telegram */ }
      if (!BOT_USERNAME) return; // sem bot configurado → segue href padrão
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
      {open && !hudMode && (
        <div
          role="status"
          aria-live="polite"
          style={{ zIndex: 50 }}
          className={`absolute left-full ml-1 top-1/2 -translate-y-1/2 -translate-x-2 w-[115px] max-w-[115px] rounded-xl px-2 py-1.5 pr-5 text-[8.5px] leading-snug text-white font-bold backdrop-blur-xl bg-black/95 border ${c.border} shadow-2xl ring-1 ring-white/15 transition-all duration-500 ease-out`}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); setHudMode(true); }}
            className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>

          <div className={`font-black tracking-wide text-white ${c.glow} drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]`}>Diretor Fabiano</div>
          <div className="text-white font-bold tracking-wide mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">{c.text}</div>
          <div className="text-white font-bold tracking-wide mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            Garantindo velocidade máxima e entrega segura em seu pedido, senhor.
          </div>
        </div>
      )}
      {hudMode && (
        <a
          href={web}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          aria-label="Fale comigo no Telegram"
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide text-white border ${c.border} bg-black/80 backdrop-blur-md ${c.ring} ring-1 animate-fade-in hover:scale-105 transition-transform`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse`} />
          Fale Comigo
        </a>
      )}
    </div>
  );

  if (inline) return badge;
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(badge, document.body);
}
