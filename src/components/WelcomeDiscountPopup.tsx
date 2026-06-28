import { useEffect, useState } from "react";

const COUPON = "PRIME10";
const STORAGE_PREFIX = "eb_welcome_popup_v2:";
const DELAY_MS = 4000;

type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego";

const ACCENTS: Record<RouteKey, { color: string; soft: string; label: string }> = {
  "/":         { color: "#FF3B5C", soft: "rgba(255,215,0,0.30)",  label: "INSTAGRAM" },
  "/tiktok":   { color: "#00f2fe", soft: "rgba(0,242,254,0.25)",  label: "TIKTOK"    },
  "/youtube":  { color: "#FF0000", soft: "rgba(255,0,0,0.25)",    label: "YOUTUBE"   },
  "/facebook": { color: "#1877F2", soft: "rgba(24,119,242,0.25)", label: "FACEBOOK"  },
  "/telegram": { color: "#00B5E2", soft: "rgba(0,181,226,0.25)",  label: "TELEGRAM"  },
  "/trafego":  { color: "#A855F7", soft: "rgba(168,85,247,0.25)", label: "TRÁFEGO"   },
};

export function WelcomeDiscountPopup({ route = "/" }: { route?: RouteKey }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = ACCENTS[route] ?? ACCENTS["/"];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = STORAGE_PREFIX + route;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    const id = window.setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem(key, "1"); } catch {}
    }, DELAY_MS);
    return () => window.clearTimeout(id);
  }, [route]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(COUPON);
      try { localStorage.setItem("eb_coupon", COUPON); } catch {}
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed left-1/2 -translate-x-1/2 z-[100] px-3 pointer-events-none"
      style={{ top: "180px" }}
    >
      <div className="pointer-events-auto">

      <div
        className="relative w-full max-w-[240px] rounded-xl p-3 text-white"
        style={{
          background: "rgba(8,8,12,0.88)",
          border: `1.2px solid ${t.color}`,
          boxShadow: `0 0 24px ${t.soft}, inset 0 0 18px rgba(0,0,0,0.6)`,
          backdropFilter: "blur(14px) saturate(140%)",
        }}
      >
        <button
          aria-label="Fechar"
          onClick={() => setOpen(false)}
          className="absolute top-1 right-2 text-white/60 hover:text-white text-base leading-none"
        >
          ×
        </button>

        <div className="text-center">
          <span
            className="inline-block text-[8px] font-black tracking-[0.35em] px-1.5 py-0.5 rounded-full border"
            style={{ color: t.color, borderColor: t.color, textShadow: `0 0 6px ${t.color}` }}
          >
            {t.label}
          </span>
          <h2
            className="mt-1 text-[11px] font-extrabold leading-tight"
            style={{ color: t.color, textShadow: `0 0 8px ${t.soft}` }}
          >
            ⚡ DESCONTO 10% INSTANTÂNEO
          </h2>
          <p className="mt-1 text-[9px] text-white/75 leading-snug">
            Aplique no checkout Pix e ganhe <b className="text-white">10% off</b> na hora.
          </p>
        </div>

        <div
          className="mt-2 flex items-stretch gap-1.5 rounded-lg p-1.5"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px dashed ${t.color}80` }}
        >
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="text-[7px] uppercase tracking-[0.25em] text-white/50">Cupom</span>
            <span
              className="font-mono font-black text-sm tracking-[0.18em]"
              style={{ color: t.color, textShadow: `0 0 8px ${t.color}` }}
            >
              {COUPON}
            </span>
          </div>
          <button
            type="button"
            onClick={copy}
            className="px-2.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all"
            style={{
              background: copied ? "#10b981" : "#f97316",
              color: "#fff",
              boxShadow: copied
                ? "0 0 12px rgba(16,185,129,0.7)"
                : "0 0 12px rgba(249,115,22,0.6)",
            }}
          >
            {copied ? "✓" : "Copiar"}
          </button>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="mt-2 w-full py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: `linear-gradient(135deg, ${t.color}, ${t.color}aa)`,
            color: "#0a0a0a",
            boxShadow: `0 0 12px ${t.soft}`,
          }}
        >
          Ativar Agora
        </button>
      </div>

    </div>
  );
}
