import { useEffect, useState } from "react";

const COUPON = "PRIME10";
const STORAGE_KEY = "eb_welcome_popup_v1";
const DELAY_MS = 4000;

type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego";

const ACCENTS: Record<RouteKey, { color: string; soft: string; label: string }> = {
  "/":         { color: "#FFD700", soft: "rgba(255,215,0,0.25)",  label: "INSTAGRAM" },
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
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    const id = window.setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }, DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

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
      className="absolute inset-0 z-[60] flex items-center justify-center px-3"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative w-full max-w-[400px] rounded-2xl p-5 text-white"
        style={{
          background: "rgba(8,8,12,0.85)",
          border: `1.5px solid ${t.color}`,
          boxShadow: `0 0 40px ${t.soft}, inset 0 0 30px rgba(0,0,0,0.6)`,
          backdropFilter: "blur(16px) saturate(140%)",
        }}
      >
        <button
          aria-label="Fechar"
          onClick={() => setOpen(false)}
          className="absolute top-2 right-3 text-white/60 hover:text-white text-xl leading-none"
        >
          ×
        </button>

        <div className="text-center">
          <span
            className="inline-block text-[9px] font-black tracking-[0.4em] px-2 py-0.5 rounded-full border"
            style={{ color: t.color, borderColor: t.color, textShadow: `0 0 8px ${t.color}` }}
          >
            {t.label} · J.A.R.V.I.S.
          </span>
          <h2
            className="mt-2 text-[15px] font-extrabold leading-tight"
            style={{ color: t.color, textShadow: `0 0 10px ${t.soft}` }}
          >
            ⚠️ ATIVAÇÃO DE PROTOCOLO DE BOOSTER EXTRA!
          </h2>
          <p className="mt-1.5 text-[11px] text-white/80 leading-snug">
            Válido por <b className="text-white">30 minutos</b>, CORRE! O J.A.R.V.I.S. liberou uma vantagem
            especial de boas-vindas para injetar autoridade no seu perfil agora mesmo.
          </p>
        </div>

        <div
          className="mt-4 flex items-stretch gap-2 rounded-xl p-2"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px dashed ${t.color}80` }}
        >
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/50">Cupom</span>
            <span
              className="font-mono font-black text-xl tracking-[0.2em]"
              style={{ color: t.color, textShadow: `0 0 10px ${t.color}` }}
            >
              {COUPON}
            </span>
          </div>
          <button
            type="button"
            onClick={copy}
            className="px-4 rounded-lg text-[12px] font-extrabold uppercase tracking-wider transition-all"
            style={{
              background: copied ? "#10b981" : "#f97316",
              color: "#fff",
              boxShadow: copied
                ? "0 0 18px rgba(16,185,129,0.7)"
                : "0 0 18px rgba(249,115,22,0.6)",
            }}
          >
            {copied ? "✓ Copiado!" : "Copiar"}
          </button>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="mt-4 w-full py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider"
          style={{
            background: `linear-gradient(135deg, ${t.color}, ${t.color}aa)`,
            color: "#0a0a0a",
            boxShadow: `0 0 20px ${t.soft}`,
          }}
        >
          Quero meu Booster Agora
        </button>
        <p className="mt-2 text-center text-[9px] text-white/40">
          Aplique no campo "Possui cupom?" do checkout Pix.
        </p>
      </div>
    </div>
  );
}
