import { useEffect, useState } from "react";

// v189 — PRIME15 restrito a pedidos ≥ R$ 30 (server-side valida).
// UI auto-aplica e mostra a regra explícita — sem BRINDE50 fake.

const VALID = "PRIME15";
const KEY = "eb_coupon";
const DISCOUNT = 0.15;
const MIN_BRL = 30;

export function getCouponDiscount(valorBrl?: number): number {
  if (typeof window === "undefined") return 0;
  try {
    if (localStorage.getItem(KEY) !== VALID) return 0;
    if (typeof valorBrl === "number" && valorBrl < MIN_BRL) return 0;
    return DISCOUNT;
  } catch { return 0; }
}

export function getAppliedCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY) === VALID ? VALID : null;
  } catch { return null; }
}

export function CouponField({ accent = "#FFD700" }: { accent?: string }) {
  const [applied, setApplied] = useState(false);

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
        🎟️ CUPOM: <span style={{ color: accent }}>PRIME15</span>
        <br />
        <span className="text-white/95 font-bold text-[12px]">
          15% DE DESCONTO EM PEDIDOS ACIMA DE R$ 30
        </span>
      </p>
      {applied && (
        <p className="mt-2 text-[11px] font-bold text-emerald-300">
          ✓ Aplicado automaticamente quando o pedido atinge R$ 30.
        </p>
      )}
    </div>
  );
}

export function DelayedCouponField({ accent = "#FFD700" }: { accent?: string }) {
  return <CouponField accent={accent} />;
}
