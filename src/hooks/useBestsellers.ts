import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBestsellers } from "@/lib/bestsellers.functions";

/**
 * useBestsellers — hidrata mapa de pacotes mais vendidos em 24h.
 * Re-fetch a cada 5min (cron atualiza a cada 30min). SSR-safe (retorna {} inicial).
 */
export function useBestsellers(): Record<string, true> {
  const [map, setMap] = useState<Record<string, true>>({});
  const fetchFn = useServerFn(getBestsellers);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetchFn()
        .then((r) => { if (!cancelled && r?.bestsellers) setMap(r.bestsellers); })
        .catch(() => {});
    };
    tick();
    const iv = setInterval(tick, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [fetchFn]);

  return map;
}
