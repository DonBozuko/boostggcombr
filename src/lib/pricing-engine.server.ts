// Server-only pricing engine. Lê custo/1000 do SMMhype, aplica multiplicadores
// de margem progressiva. Em qualquer falha cai no FALLBACK_RATES seguro.
// NÃO importar de módulos client-reachable em escopo de módulo.

import { resolveServiceIdAsync } from "./smmhype.server";

export type Category =
  | "instagram:seguidores"
  | "instagram:curtidas"
  | "instagram:visualizacoes";

// Quantidades canônicas — mantém IDs existentes do dispatcher (não inventa novos).
// Phase A repõe preço, não cria novos pacotes.
const CANONICAL_QTYS: Record<Category, Array<{ id: string; qty: number }>> = {
  "instagram:seguidores": [
    { id: "p100", qty: 100 }, { id: "p500", qty: 500 }, { id: "p1k", qty: 1000 },
    { id: "p2k", qty: 2000 }, { id: "p5k", qty: 5000 }, { id: "p10k", qty: 10000 },
    { id: "p20k", qty: 20000 }, { id: "p50k", qty: 50000 }, { id: "p100k", qty: 100000 },
  ],
  "instagram:curtidas": [
    { id: "l100", qty: 100 }, { id: "l500", qty: 500 }, { id: "l1k", qty: 1000 },
    { id: "l2k", qty: 2000 }, { id: "l5k", qty: 5000 },
  ],
  "instagram:visualizacoes": [
    { id: "v1k", qty: 1000 }, { id: "v5k", qty: 5000 }, { id: "v10k", qty: 10000 },
    { id: "v25k", qty: 25000 }, { id: "v50k", qty: 50000 },
  ],
};

// Categoria → pacote-amostra usado para resolver o service_id no SMMhype.
const PROBE: Record<Category, { pacote: string; qty: number }> = {
  "instagram:seguidores": { pacote: "p1k", qty: 1000 },
  "instagram:curtidas":   { pacote: "l1k", qty: 1000 },
  "instagram:visualizacoes": { pacote: "v1k", qty: 1000 },
};

// Custo BRL por 1000 unidades — fallback seguro (acima do custo real estimado
// com folga). Calibrado para não vender abaixo do custo se a API falhar.
const FALLBACK_RATES_PER_1K: Record<Category, number> = {
  "instagram:seguidores": 12.0,
  "instagram:curtidas":   2.4,
  "instagram:visualizacoes": 1.5,
};

// SMMhype reporta `rate` em USD por 1000. Conversão fixa (alinhada com
// cotacao_brl padrão usado no admin).
const USD_TO_BRL = 7.0;

function multiplierFor(qty: number): number {
  if (qty <= 1000) return 3.5;
  if (qty <= 10000) return 2.2;
  return 1.6;
}

function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

// Margem de segurança fixa: 15% extra sobre o preço pós-multiplicador.
// Cobre o cupom PRIME10 (-10%) e blinda contra oscilação de custo da API.
const SAFETY_MARGIN = 1.15;

function priceFromCost(qty: number, costPer1k: number): number {
  const raw = (qty / 1000) * costPer1k * multiplierFor(qty) * SAFETY_MARGIN;
  // Arredonda para cima em R$ 0,50 para evitar centavos esquisitos.
  return Math.max(3, ceilTo(raw, 0.5));
}

function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

async function fetchSmmRatePer1kBRL(category: Category): Promise<number | null> {
  const apiKey = process.env.SMMHYPE_API_KEY;
  if (!apiKey) return null;

  const probe = PROBE[category];
  const serviceId = await resolveServiceIdAsync(probe.pacote, probe.qty).catch(() => null);
  if (!serviceId) return null;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch("https://smmhype.com/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const list = (await res.json()) as Array<{ service: number | string; rate: string | number }>;
    if (!Array.isArray(list)) return null;
    const found = list.find((s) => Number(s.service) === serviceId);
    const rateUsd = Number(found?.rate);
    if (!Number.isFinite(rateUsd) || rateUsd <= 0) return null;
    return rateUsd * USD_TO_BRL;
  } catch {
    return null;
  }
}

export type GridItem = {
  id: string;
  quantidade: number;
  valor: number;
  price: string;
};

export type PricingGridResult = {
  category: Category;
  source: "api" | "fallback";
  cost_per_1k_brl: number;
  items: GridItem[];
  generated_at: string;
};

export async function getPricingGridImpl(category: Category): Promise<PricingGridResult> {
  const apiRate = await fetchSmmRatePer1kBRL(category);
  const source: "api" | "fallback" = apiRate != null ? "api" : "fallback";
  const cost = apiRate ?? FALLBACK_RATES_PER_1K[category];

  const items: GridItem[] = CANONICAL_QTYS[category].map(({ id, qty }) => {
    const valor = priceFromCost(qty, cost);
    return { id, quantidade: qty, valor, price: formatBRL(valor) };
  });

  return {
    category,
    source,
    cost_per_1k_brl: Number(cost.toFixed(4)),
    items,
    generated_at: new Date().toISOString(),
  };
}
