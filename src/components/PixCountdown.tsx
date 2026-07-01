// v105 — Cronômetro visual de urgência sincronizado com o poll de 1s (v96) e o hardStop de 3min (v104).
import { useEffect, useRef, useState } from "react";

type Props = {
  active: boolean;
  seconds?: number;
  onExpire: () => void;
};

export default function PixCountdown({ active, seconds = 180, onExpire }: Props) {
  const [left, setLeft] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setLeft(seconds);
      firedRef.current = false;
      return;
    }
    firedRef.current = false;
    setLeft(seconds);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, seconds - elapsed);
      setLeft(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        try { onExpire(); } catch {}
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active, seconds, onExpire]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const urgent = left <= 30;

  return (
    <div
      className={`rounded-lg border-2 py-2 px-3 text-center font-mono font-bold text-lg tracking-wider select-none ${
        urgent
          ? "border-red-500 bg-red-950/40 text-red-200 animate-pulse shadow-[0_0_20px_rgba(255,0,60,0.45)]"
          : "border-yellow-500/70 bg-yellow-950/30 text-yellow-100 animate-pulse shadow-[0_0_16px_rgba(255,200,0,0.25)]"
      }`}
      aria-live="polite"
    >
      ⏱️ O seu QR Code expira em: {mm}:{ss}
    </div>
  );
}
