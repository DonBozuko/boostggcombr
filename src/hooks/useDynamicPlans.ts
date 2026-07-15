import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPricingGrid, type PricingCategory } from "@/lib/pricing.functions";
import { useBestsellers } from "@/hooks/useBestsellers";

export type DynPlan = {
  id: string;
  tier: string;
  tag?: string;
  qty?: string;
  quantidade: number;
  valor: number;
  price: string;
  benefit?: string;
  highlight?: string;
};

type GridItem = { id: string; quantidade: number; valor: number; price: string };

const tagFor = (q: number): string => {
  if (q <= 200) return "+ MINI";
  if (q <= 750) return "+ STARTER";
  if (q <= 2000) return "+ BASIC";
  if (q <= 7500) return "+ GROWTH";
  if (q <= 20000) return "+ PRO";
  if (q <= 75000) return "+ ELITE";
  return "+ ULTIMATE";
};

/**
 * v87 — Strict Omnichannel Catalog Replication
 * Hidrata pacotes públicos direto de `pricing_items` (Supabase) via
 * `getPricingGrid` server fn. Se a categoria não vier populada, mantém o
 * fallback estático — nunca renderiza vitrine vazia.
 */
export function useDynamicPlans<K extends string>(
  map: Record<K, { category: PricingCategory; fallback: DynPlan[]; unitLabel: string }>,
): Record<K, DynPlan[]> {
  const keys = Object.keys(map) as K[];
  const getPricingGridFn = useServerFn(getPricingGrid);

  const [gridBy, setGridBy] = useState<Record<K, GridItem[]>>(
    () => Object.fromEntries(keys.map((k) => [k, [] as GridItem[]])) as Record<K, GridItem[]>,
  );

  useEffect(() => {
    let cancelled = false;
    try { window.localStorage.removeItem("ebp_pricing_overrides_v1"); } catch {}
    const tick = () => {
      Promise.all(
        keys.map((k) =>
          getPricingGridFn({ data: { category: map[k].category } }).catch(() => null),
        ),
      ).then((results) => {
        if (cancelled) return;
        const next = Object.fromEntries(keys.map((k) => [k, [] as GridItem[]])) as Record<K, GridItem[]>;
        results.forEach((r, i) => {
          if (r?.items?.length) next[keys[i]] = r.items as GridItem[];
        });
        if (keys.some((k) => next[k].length)) setGridBy(next);
      });
    };
    tick();
    // v106 — Sincronismo vivo: re-hidrata a vitrine a cada 15s (a fonte
    // pricing_items é atualizada pelo cron sync-pricing seg a seg).
    const iv = setInterval(tick, 15000);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPricingGridFn]);

  const staticById = useMemo(() => {
    const m = new Map<string, DynPlan>();
    for (const k of keys) for (const p of map[k].fallback) m.set(p.id, p);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bestsellers = useBestsellers();

  return useMemo(() => {
    const out = {} as Record<K, DynPlan[]>;
    for (const k of keys) {
      const items = gridBy[k];
      const { fallback, unitLabel } = map[k];
      if (!items.length) { out[k] = fallback; continue; }
      out[k] = items.map((it) => {
        const s = staticById.get(it.id);
        const qtyStr = it.quantidade.toLocaleString("pt-BR");
        const isBestseller = bestsellers[it.id] === true;
        return {
          id: it.id,
          tier: s?.tier ?? `${qtyStr} ${unitLabel}`,
          tag: isBestseller ? "🔥 MAIS VENDIDO 24H" : (s?.tag ?? tagFor(it.quantidade)),
          qty: qtyStr,
          quantidade: it.quantidade,
          valor: it.valor,
          price: it.price,
          benefit: isBestseller ? "🔥 Escolha dos clientes nas últimas 24h" : (s?.benefit ?? "Entrega rápida e segura"),
          highlight: isBestseller ? "true" : s?.highlight,
        };
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridBy, bestsellers]);
}
