import { useEffect, useRef, useState } from "react";

const COUPON_REVEAL_DELAY_MS = 5_000; // 3s fala dos avatares + 2s respiro pós-conversa

// v52-patch — Micro-FOMO Ticker Core + Tick-Tac Syncer real após reveal
function useCouponCountdown(active: boolean, seconds: number = 10) {
  const [left, setLeft] = useState(seconds);
  const ctxRef = useRef<AudioContext | null>(null);
  const armedRef = useRef(false);
  const tickRef = useRef(0);

  useEffect(() => {
    function arm() {
      if (armedRef.current) return;
      try {
        const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        ctxRef.current = new Ctx();
        armedRef.current = true;
      } catch {}
    }
    window.addEventListener("pointerdown", arm, { once: true });
    window.addEventListener("keydown", arm, { once: true });
    window.setTimeout(arm, COUPON_REVEAL_DELAY_MS);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  useEffect(() => {
    function reset() {
      tickRef.current = 0;
      setLeft(seconds);
    }
    document.addEventListener("visibilitychange", reset);
    window.addEventListener("pageshow", reset);
    return () => document.removeEventListener("visibilitychange", reset);
  }, [seconds]);

  useEffect(() => {
    if (!active) {
      tickRef.current = 0;
      setLeft(seconds);
      return;
    }

    const playTick = (current: number) => {
      const ctx = ctxRef.current;
      if (!ctx || ctx.state !== "running") return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const duration = current <= 3 ? 0.085 : 0.06;
        osc.type = current <= 3 ? "sawtooth" : "square";
        osc.frequency.value = current <= 3 ? 2200 + tickRef.current * 80 : current % 2 === 0 ? 1800 : 1400;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(current <= 3 ? 0.12 : 0.08, ctx.currentTime + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration + 0.01);
      } catch {}
    };

    setLeft(seconds);
    playTick(seconds);
    const t = setInterval(() => {
      setLeft((s) => {
        tickRef.current += 1;
        const next = s <= 0 ? seconds : s - 1;
        playTick(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [active, seconds]);

  return left;
}

function CouponCountdownBanner({ active }: { active: boolean }) {
  const left = useCouponCountdown(active, 10);
  const ss = left.toString().padStart(2, "0");
  return (
    <div
      className="mb-1.5 text-center text-[11px] font-mono font-extrabold animate-pulse text-red-500 tracking-wider"
      style={{ textShadow: "0 0 8px rgba(239,68,68,0.9)" }}
      aria-live="polite"
    >
      ⚠️ O SEU CUPOM EXPIRA EM: 00:{ss}
    </div>
  );
}

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

export function getAppliedCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY) === VALID ? VALID : null;
  } catch {
    return null;
  }
}

export function CouponField({ accent = "#FFD700" }: { accent?: string }) {
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === VALID) {
        setApplied(true);
        setValue(VALID);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setVisible(false);
    const id = window.setTimeout(() => setVisible(true), COUPON_REVEAL_DELAY_MS);
    return () => window.clearTimeout(id);
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
      className={`transition-all animate-slide-down duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
      }`}
      aria-hidden={!visible}
    >
    <CouponCountdownBanner active={visible} />
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
          ✓ Cupom <b>{VALID}</b> aplicado — 15% de desconto no Pix.
        </p>
      )}
      {error && !applied && (
        <p className="mt-2 text-[12px] font-bold text-red-400">{error}</p>
      )}
    </div>
    </div>
  );
}
