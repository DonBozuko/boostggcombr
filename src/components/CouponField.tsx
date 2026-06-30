import { useEffect, useRef, useState } from "react";

// v53 — Unified State Machine Core
// Linha do tempo cravada a partir do carregamento da página:
//   0s  → avatares iniciam fala (gerenciado pelos Badges)
//   3s  → balões somem suavemente
//   5s  → CouponField monta + cronômetro 10→0 dispara + tic-tac começa
const COUPON_REVEAL_DELAY_MS = 5_000;

function remainingUntilCouponReveal(): number {
  if (typeof window === "undefined") return COUPON_REVEAL_DELAY_MS;
  return Math.max(0, COUPON_REVEAL_DELAY_MS - Math.floor(performance.now()));
}

// Singleton AudioContext + unlock híbrido (Web Audio API + gesto do usuário).
let _ctx: AudioContext | null = null;
let _unlocked = false;
const _pendingTicks: Array<() => void> = [];

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _ctx = new Ctx();
  } catch { return null; }
  return _ctx;
}

function flushPending() {
  while (_pendingTicks.length) {
    const fn = _pendingTicks.shift();
    try { fn?.(); } catch {}
  }
}

function armAudioUnlock() {
  if (typeof window === "undefined" || _unlocked) return;
  const unlock = () => {
    const ctx = getCtx();
    if (!ctx) return;
    const finish = () => {
      _unlocked = ctx.state === "running";
      if (_unlocked) {
        flushPending();
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("click", unlock);
      }
    };
    if (ctx.state === "suspended") ctx.resume().then(finish).catch(() => {});
    else finish();
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("click", unlock);
  // Tentativa imediata (alguns browsers liberam após primeira interação anterior na sessão).
  unlock();
}

function scheduleTick(fire: () => void) {
  if (_unlocked) { fire(); return; }
  _pendingTicks.push(fire);
  armAudioUnlock();
}

function useCouponCountdown(active: boolean, seconds: number = 10) {
  const [left, setLeft] = useState(seconds);
  const tickRef = useRef(0);

  useEffect(() => { armAudioUnlock(); }, []);

  useEffect(() => {
    if (!active) { tickRef.current = 0; setLeft(seconds); return; }

    const playTick = (current: number) => {
      const fire = () => {
        const ctx = getCtx();
        if (!ctx || ctx.state !== "running") return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const duration = current <= 3 ? 0.09 : 0.06;
          osc.type = current <= 3 ? "sawtooth" : "square";
          osc.frequency.value = current <= 3 ? 2200 + tickRef.current * 80 : current % 2 === 0 ? 1800 : 1400;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(current <= 3 ? 0.14 : 0.08, ctx.currentTime + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + duration + 0.01);
        } catch {}
      };
      scheduleTick(fire);
    };

    setLeft(seconds);
    playTick(seconds);
    const t = window.setInterval(() => {
      setLeft((s) => {
        tickRef.current += 1;
        const next = s <= 0 ? seconds : s - 1;
        playTick(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
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
const DISCOUNT = 0.15;

export function getCouponDiscount(): number {
  if (typeof window === "undefined") return 0;
  try { return localStorage.getItem(KEY) === VALID ? DISCOUNT : 0; } catch { return 0; }
}

export function getAppliedCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY) === VALID ? VALID : null; } catch { return null; }
}

export function CouponField({ accent = "#FFD700" }: { accent?: string }) {
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === VALID) { setApplied(true); setValue(VALID); }
    } catch {}
  }, []);

  function apply() {
    const v = value.trim().toUpperCase();
    if (v === VALID) {
      try { localStorage.setItem(KEY, VALID); } catch {}
      setApplied(true); setError("");
    } else {
      setError("Cupom inválido"); setApplied(false);
      try { localStorage.removeItem(KEY); } catch {}
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch {}
    setApplied(false); setValue(""); setError("");
  }

  return (
    <div className="animate-slide-down">
      <CouponCountdownBanner active={true} />
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

// v54 — Isomorphic Shell Layout Restore
// Renderiza um wrapper invisível desde o load para NÃO afetar layout dos vizinhos
// (grid, avatares, HUD). Aos 5s revela o CouponField como overlay isolado com
// slide-down, sem reflow nem remount dos elementos irmãos.
export function DelayedCouponField({ accent = "#FFD700" }: { accent?: string }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    armAudioUnlock();
    const remaining = remainingUntilCouponReveal();
    if (remaining === 0) { setRevealed(true); return; }
    const id = window.setTimeout(() => setRevealed(true), remaining);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      aria-hidden={!revealed}
      style={{
        opacity: revealed ? 1 : 0,
        pointerEvents: revealed ? "auto" : "none",
        transition: "opacity 0.3s ease-out",
      }}
    >
      {revealed ? <CouponField accent={accent} /> : null}
    </div>
  );
}
