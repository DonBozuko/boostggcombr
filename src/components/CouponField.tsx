import { useEffect, useState } from "react";

const VALID = "PRIME15";
const KEY = "eb_coupon";
const DISCOUNT = 0.15; // 15%

export function getCouponDiscount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return localStorage.getItem(KEY) === VALID ? DISCOUNT : 0;
  } catch {
    return 0;
  }
}

export function CouponField({ accent = "#FFD700" }: { accent?: string }) {
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === VALID) {
        setApplied(true);
        setValue(VALID);
      }
    } catch {}
  }, []);

  function apply() {
    const v = value.trim().toUpperCase();
    if (v === VALID) {
      try { localStorage.setItem(KEY, VALID); } catch {}
      setApplied(true);
      setError("");
    } else {
      setError("Cupom inválido");
      setApplied(false);
      try { localStorage.removeItem(KEY); } catch {}
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch {}
    setApplied(false);
    setValue("");
    setError("");
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px dashed ${accent}66`,
        backdropFilter: "blur(8px)",
      }}
    >
      <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>
        🎟️ Possui um cupom de desconto?
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          disabled={applied}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Digite aqui seu cupom"
          className="flex-1 h-11 px-3 rounded-lg text-sm font-mono uppercase tracking-wider outline-none disabled:opacity-70"
          style={{
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${accent}44`,
            color: "#fff",
          }}
        />
        <button
          type="button"
          onClick={applied ? clear : apply}
          className="px-4 h-11 rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all shrink-0"
          style={{
            background: applied ? "#10b981" : accent,
            color: "#0a0a0a",
            boxShadow: `0 0 14px ${accent}66`,
          }}
        >
          {applied ? "✓ Trocar" : "Aplicar"}
        </button>
      </div>
      {applied && (
        <p className="mt-2 text-[12px] font-bold" style={{ color: "#34d399" }}>
          ✓ Cupom <b>{VALID}</b> aplicado — 10% de desconto no Pix.
        </p>
      )}
      {error && !applied && (
        <p className="mt-2 text-[12px] font-bold text-red-400">{error}</p>
      )}
    </div>
  );
}
