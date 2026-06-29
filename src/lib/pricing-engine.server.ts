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
// Atacado massivo: ~50 SKUs por rede distribuídos entre categorias.
// Cobre micro-lotes (100/200) até volumes gigantes (500k/1M).
const SEGUIDORES_QTYS = [
  100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000,
  7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 200000, 500000,
];
const CURTIDAS_QTYS = [
  100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000,
  7500, 10000, 20000, 50000, 100000,
];
const VIEWS_QTYS = [
  1000, 2000, 5000, 10000, 15000, 25000, 50000, 75000, 100000,
  200000, 300000, 500000, 750000, 1000000,
];

function pid(prefix: string, q: number): { id: string; qty: number } {
  const label =
    q >= 1_000_000 ? `${q / 1_000_000}m` :
    q >= 1000 ? `${q / 1000}k` : `${q}`;
  return { id: `${prefix}${label}`, qty: q };
}

const CANONICAL_QTYS: Record<Category, Array<{ id: string; qty: number }>> = {
  "instagram:seguidores": SEGUIDORES_QTYS.map((q) => pid("p", q)),
  "instagram:curtidas": CURTIDAS_QTYS.map((q) => pid("l", q)),
  "instagram:visualizacoes": VIEWS_QTYS.map((q) => pid("v", q)),
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

// Strict 100% Profit + 15% Coupon Buffer Engine.
// preço = (custo * 2.0) / 0.85  → após PRIME15 (-15%) ainda restam 100% de lucro.
const PROFIT_MULT = 2.0;
const COUPON_BUFFER = 0.85; // 1 - 0.15

function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function priceFromCost(qty: number, costPer1k: number): number {
  const cost = parseFloat(String(costPer1k));
  const baseCost = (qty / 1000) * cost;
  const raw = (baseCost * PROFIT_MULT) / COUPON_BUFFER;
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
