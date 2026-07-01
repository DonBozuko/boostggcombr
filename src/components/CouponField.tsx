import { useEffect, useState } from "react";

// v56-Final — Strict Raw Component Injection
// Cupom PRIME15 FIXO, sempre visível, auto-aplicado no mount.
// Sem cronômetros, sem áudio, sem delays, sem retorno null.

const VALID = "PRIME15";
const KEY = "eb_coupon";
const DISCOUNT = 0.15;

// v104 — BRINDE50 (bônus em seguidores, não em cash).
const BRINDE = "BRINDE50";
const BRINDE_KEY = "eb_brinde";

export function getCouponDiscount(): number {
  if (typeof window === "undefined") return 0;
  try { return localStorage.getItem(KEY) === VALID ? DISCOUNT : 0; } catch { return 0; }
}

export function getAppliedCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const parts: string[] = [];
    if (localStorage.getItem(KEY) === VALID) parts.push(VALID);
    if (localStorage.getItem(BRINDE_KEY) === BRINDE) parts.push(BRINDE);
    return parts.length ? parts.join(",") : null;
  } catch { return null; }
}

export function setBrindeApplied() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(BRINDE_KEY, BRINDE); } catch {}
}

export function CouponField({ accent = "#FFD700" }: { accent?: string }) {
  const [applied, setApplied] = useState(false);

  // Auto-aplica PRIME15 no primeiro render — banner sempre verdadeiro.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, VALID);
      setApplied(true);
    } catch { setApplied(true); }
  }, []);

  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: "rgba(139, 0, 0, 0.55)",
        border: "2px dashed #fff",
        backdropFilter: "blur(10px) saturate(140%)",
        boxShadow: `0 0 22px rgba(220,38,38,0.55), inset 0 0 18px rgba(0,0,0,0.35)`,
      }}
      role="status"
      aria-live="polite"
    >
      <p
        className="text-white font-extrabold uppercase tracking-wider leading-tight"
        style={{
          fontSize: "13px",
          textShadow: "0 0 8px rgba(0,0,0,0.9), 0 1px 0 rgba(0,0,0,0.6)",
          letterSpacing: "0.05em",
        }}
      >
        🎟️ CUPOM ATIVO: <span style={{ color: accent }}>PRIME15</span>
        <br />
        <span className="text-white/95 font-bold text-[12px]">
          APLIQUE 15% DE DESCONTO EXTRA NO CHECKOUT
        </span>
      </p>
      {applied && (
        <p className="mt-2 text-[11px] font-bold text-emerald-300">
          ✓ Desconto será aplicado automaticamente no Pix.
        </p>
      )}
    </div>
  );
}

// Alias direto — rotas que importam DelayedCouponField recebem o banner fixo.
export function DelayedCouponField({ accent = "#FFD700" }: { accent?: string }) {
  return <CouponField accent={accent} />;
}
