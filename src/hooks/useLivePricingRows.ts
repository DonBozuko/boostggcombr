// v329 — Preço vivo nas landings SEO.
//
// Causa raiz corrigida: as landings de SEO tinham tabela de preço escrita à mão.
// Com a Autoridade de Preço reajustando o catálogo sozinha, o número da landing
// descolava do número da vitrine — cliente clica achando R$ 28 e paga R$ 53.
// Aqui o preço é lido do MESMO `pricing_items` que a vitrine usa.
//
// SSR/prerender continua servindo o valor estático (bom pro Google e sem
// tela vazia); ao hidratar, o preço real substitui o texto.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPricingGrid, getBrPricingGrid, type PricingCategory } from "@/lib/pricing.functions";

/** v337 — landings BR leem a grade curada 'x:seguidores:br'. */
export type LivePricingCategory = PricingCategory | "instagram:seguidores:br" | "tiktok:seguidores:br";

export type LivePricingRow = {
  /** id do pacote em pricing_items (ex.: "kf1k"). */
  id: string;
  qty: string;
  /** preço estático de fallback (SSR e falha de rede). */
  price: string;
  note?: string;
};

const brl = (v: number) =>
  `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Resolve o preço real de cada linha. Mantém a ordem e o texto originais,
 * trocando apenas o valor quando o catálogo responde.
 */
export function useLivePricingRows(
  categories: PricingCategory[],
  rows: LivePricingRow[],
): LivePricingRow[] {
  const getGrid = useServerFn(getPricingGrid);
  const [live, setLive] = useState<Record<string, number>>({});
  // v336 — linha de landing de pacote pausado é fantasma: some depois que o
  // catálogo responde. Antes da resposta (SSR/prerender) mantém o estático.
  const [loaded, setLoaded] = useState(false);
  const catKey = categories.join("|");

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      categories.map((category) => getGrid({ data: { category } }).catch(() => null)),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const r of results) {
        for (const it of r?.items ?? []) {
          if (it?.id && Number(it.valor) > 0) map[it.id] = Number(it.valor);
        }
      }
      if (results.some((r) => r !== null)) { setLive(map); setLoaded(true); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catKey, getGrid]);

  return rows
    .filter((r) => !loaded || !r.id || live[r.id] !== undefined)
    .map((r) => {
      const v = live[r.id];
      return v ? { ...r, price: brl(v) } : r;
    });
}
