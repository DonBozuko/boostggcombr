// v190 — Detecta intenção de saída para disparar modal de recuperação.
// Desktop: mouseleave pelo topo. Mobile: fallback via visibilitychange + tempo mínimo na página.
import { useEffect, useRef, useState } from "react";

type Options = {
  enabled: boolean;
  minDwellMs?: number;
};

export function useExitIntent({ enabled, minDwellMs = 8000 }: Options) {
  const [triggered, setTriggered] = useState(false);
  const armedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    armedAt.current = Date.now();

    const shouldFire = () => {
      if (triggered) return false;
      if (!armedAt.current) return false;
      return Date.now() - armedAt.current >= minDwellMs;
    };

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY > 0) return; // só topo
      if (e.relatedTarget || (e as any).toElement) return;
      if (shouldFire()) setTriggered(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden" && shouldFire()) {
        setTriggered(true);
      }
    };

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, minDwellMs, triggered]);

  return { triggered, reset: () => setTriggered(false) };
}
