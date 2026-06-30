// Server-only pricing engine. Lê custo/1000 do SMMhype, aplica multiplicadores
// de margem progressiva High-CAC. Em qualquer falha cai no FALLBACK_RATES.
// NÃO importar de módulos client-reachable em escopo de módulo.

import { resolveServiceIdAsync } from "./smmhype.server";

export type Category =
  | "instagram:seguidores"
  | "instagram:curtidas"
  | "instagram:visualizacoes"
  | "tiktok:seguidores"
  | "tiktok:curtidas"
  | "tiktok:visualizacoes"
  | "youtube:inscritos"
  | "youtube:visualizacoes"
  | "facebook:seguidores"
  | "facebook:curtidas"
  | "telegram:canal"
  | "telegram:grupo"
  | "trafego:br"
  | "trafego:global";

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
const SUBS_QTYS = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];
const MEMBROS_QTYS = [100, 250, 500, 1000, 2000, 5000, 10000];
const TRAFEGO_QTYS = [1000, 2500, 5000, 10000, 25000, 50000, 100000];

function pid(prefix: string, q: number): { id: string; qty: number } {
  const label =
    q >= 1_000_000 ? `${q / 1_000_000}m` :
    q >= 1000 ? `${q / 1000}k`.replace(".", "_") : `${q}`;
  return { id: `${prefix}${label}`, qty: q };
}

const CANONICAL_QTYS: Record<Category, Array<{ id: string; qty: number }>> = {
  "instagram:seguidores": SEGUIDORES_QTYS.map((q) => pid("p", q)),
  "instagram:curtidas": CURTIDAS_QTYS.map((q) => pid("l", q)),
  "instagram:visualizacoes": VIEWS_QTYS.map((q) => pid("v", q)),
  "tiktok:seguidores": SEGUIDORES_QTYS.map((q) => pid("tf", q)),
  "tiktok:curtidas": CURTIDAS_QTYS.map((q) => pid("tl", q)),
  "tiktok:visualizacoes": VIEWS_QTYS.map((q) => pid("tv", q)),
  "youtube:inscritos": SUBS_QTYS.map((q) => pid("ys", q)),
  "youtube:visualizacoes": VIEWS_QTYS.map((q) => pid("yv", q)),
  "facebook:seguidores": SEGUIDORES_QTYS.map((q) => pid("ff", q)),
  "facebook:curtidas": CURTIDAS_QTYS.map((q) => pid("fl", q)),
  "telegram:canal": MEMBROS_QTYS.map((q) => pid("tgc", q)),
  "telegram:grupo": MEMBROS_QTYS.map((q) => pid("tgg", q)),
  "trafego:br": TRAFEGO_QTYS.map((q) => pid("wbr", q)),
  "trafego:global": TRAFEGO_QTYS.map((q) => pid("wgl", q)),
};

// Categoria → pacote-amostra usado para resolver o service_id no SMMhype.
const PROBE: Record<Category, { pacote: string; qty: number }> = {
  "instagram:seguidores":    { pacote: "p1k",  qty: 1000 },
  "instagram:curtidas":      { pacote: "l1k",  qty: 1000 },
  "instagram:visualizacoes": { pacote: "v1k",  qty: 1000 },
  "tiktok:seguidores":       { pacote: "tf1k", qty: 1000 },
  "tiktok:curtidas":         { pacote: "tl1k", qty: 1000 },
  "tiktok:visualizacoes":    { pacote: "tv1k", qty: 1000 },
  "youtube:inscritos":       { pacote: "ys1k", qty: 1000 },
  "youtube:visualizacoes":   { pacote: "yv1k", qty: 1000 },
  "facebook:seguidores":     { pacote: "ff1k", qty: 1000 },
  "facebook:curtidas":       { pacote: "fl1k", qty: 1000 },
  "telegram:canal":          { pacote: "tgc1k", qty: 1000 },
  "telegram:grupo":          { pacote: "tgg1k", qty: 1000 },
  "trafego:br":              { pacote: "wbr1k", qty: 1000 },
  "trafego:global":          { pacote: "wgl1k", qty: 1000 },
};

// Custo BRL por 1000 — fallback calibrado acima do custo real, com folga.
const FALLBACK_RATES_PER_1K: Record<Category, number> = {
  "instagram:seguidores":    12.0,
  "instagram:curtidas":       2.4,
  "instagram:visualizacoes":  1.5,
  "tiktok:seguidores":       18.0,
  "tiktok:curtidas":          3.0,
  "tiktok:visualizacoes":     0.8,
  "youtube:inscritos":       60.0,
  "youtube:visualizacoes":    3.5,
  "facebook:seguidores":     14.0,
  "facebook:curtidas":        3.0,
  "telegram:canal":          18.0,
  "telegram:grupo":          18.0,
  "trafego:br":               4.0,
  "trafego:global":           2.0,
};

const USD_TO_BRL = 7.0;
const COUPON_BUFFER = 0.85; // 1 - 0.15 (PRIME15)

function tierMultiplier(qty: number): number {
  // Premium Balancing Adjust v42
  if (qty <= 1000) return 4.0;
  if (qty <= 10000) return 2.6;
  return 1.8;
}

const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step;

function priceFromCost(qty: number, costPer1k: number): number {
  const cost = parseFloat(String(costPer1k));
  const baseCost = (qty / 1000) * cost;
  const raw = (baseCost * tierMultiplier(qty)) / COUPON_BUFFER;
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
  items: GridItem[];
  generated_at: string;
};


async function readCachedRate(category: Category): Promise<number | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pricing_cache" as any)
      .select("cost_per_1k_brl")
      .eq("category", category)
      .maybeSingle();
    const v = Number((data as any)?.cost_per_1k_brl);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

// v47 — lê itens já precificados 1:1 do pricing_items.
async function readCachedItems(category: Category): Promise<Map<string, { cost: number; price: number; source: "api" | "fallback" }>> {
  const out = new Map<string, { cost: number; price: number; source: "api" | "fallback" }>();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, cost_brl, price_brl, source")
      .eq("category", category);
    for (const row of (data ?? []) as Array<any>) {
      out.set(String(row.pacote), {
        cost: Number(row.cost_brl) || 0,
        price: Number(row.price_brl) || 0,
        source: row.source === "api" ? "api" : "fallback",
      });
    }
  } catch {
    /* ignora — cai no fallback de fórmula */
  }
  return out;
}

export async function getPricingGridImpl(category: Category): Promise<PricingGridResult> {
  // Hermetic Engine v47: leitura 1:1 do pricing_items (preço final por card).
  // Fallback: pricing_cache (per-1k) → tabela estática.
  const [itemsMap, cachedRate] = await Promise.all([
    readCachedItems(category),
    readCachedRate(category),
  ]);
  const rateFallback = cachedRate ?? FALLBACK_RATES_PER_1K[category];
  let anyApi = false;

  const items: GridItem[] = CANONICAL_QTYS[category].map(({ id, qty }) => {
    const hit = itemsMap.get(id);
    if (hit && hit.price > 0) {
      if (hit.source === "api") anyApi = true;
      return { id, quantidade: qty, valor: hit.price, price: formatBRL(hit.price) };
    }
    const valor = priceFromCost(qty, rateFallback);
    return { id, quantidade: qty, valor, price: formatBRL(valor) };
  });

  const source: "api" | "fallback" = anyApi || cachedRate != null ? "api" : "fallback";

  return {
    category,
    source,
    
    items,
    generated_at: new Date().toISOString(),
  };
}

// v47 — sincroniza TODOS os ~200 cards (1 chamada services + 1 resolver por card).
export async function syncPricingCacheAll(): Promise<{
  ok: boolean;
  updated: number;
  results: Array<{ category: Category; cost: number; source: "api" | "fallback" }>;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const apiKey = process.env.SMMHYPE_API_KEY;

  // 1 única chamada services → mapa serviceId → rate(USD/1000)
  const rateById = new Map<number, number>();
  if (apiKey) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("https://smmhype.com/api/v2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const list = (await res.json()) as Array<{ service: number | string; rate: string | number }>;
        if (Array.isArray(list)) {
          for (const s of list) {
            const id = Number(s.service);
            const r = Number(s.rate);
            if (Number.isFinite(id) && Number.isFinite(r) && r > 0) rateById.set(id, r);
          }
        }
      }
    } catch { /* ignora — usa fallback */ }
  }

  const cats = Object.keys(CANONICAL_QTYS) as Category[];
  const itemRows: Array<{
    pacote: string; category: Category; quantidade: number;
    provider_service_id: number | null; cost_brl: number; price_brl: number;
    source: "api" | "fallback"; synced_at: string;
  }> = [];
  const catSummary: Array<{ category: Category; cost: number; source: "api" | "fallback" }> = [];

  const now = new Date().toISOString();

  for (const cat of cats) {
    let catCostPer1k = FALLBACK_RATES_PER_1K[cat];
    let catSource: "api" | "fallback" = "fallback";

    for (const { id, qty } of CANONICAL_QTYS[cat]) {
      const serviceId = await resolveServiceIdAsync(id, qty).catch(() => null);
      const usdPer1k = serviceId != null ? rateById.get(serviceId) : undefined;
      let cost_brl: number;
      let source: "api" | "fallback";
      if (typeof usdPer1k === "number" && usdPer1k > 0) {
        cost_brl = (qty / 1000) * usdPer1k * USD_TO_BRL;
        source = "api";
        catCostPer1k = usdPer1k * USD_TO_BRL;
        catSource = "api";
      } else {
        cost_brl = (qty / 1000) * FALLBACK_RATES_PER_1K[cat];
        source = "fallback";
      }
      // Markup v42 aplicado item-a-item sobre o custo real BRL
      const raw = (cost_brl * tierMultiplier(qty)) / COUPON_BUFFER;
      const price_brl = Math.max(3, ceilTo(raw, 0.5));
      itemRows.push({
        pacote: id, category: cat, quantidade: qty,
        provider_service_id: serviceId ?? null,
        cost_brl: Number(cost_brl.toFixed(4)),
        price_brl: Number(price_brl.toFixed(2)),
        source, synced_at: now,
      });
    }
    catSummary.push({ category: cat, cost: catCostPer1k, source: catSource });
  }

  // Upsert em pricing_items (1:1) + pricing_cache (resumo por categoria, retrocompat)
  const { error: e1 } = await supabaseAdmin
    .from("pricing_items" as any)
    .upsert(itemRows, { onConflict: "pacote" });
  const summaryRows = catSummary.map((r) => ({
    category: r.category,
    cost_per_1k_brl: Number(r.cost.toFixed(4)),
    source: r.source,
    synced_at: now,
  }));
  const { error: e2 } = await supabaseAdmin
    .from("pricing_cache" as any)
    .upsert(summaryRows, { onConflict: "category" });

  return { ok: !e1 && !e2, updated: itemRows.length, results: catSummary };
}

// v47 — preço final por pacote individual (checkout / webhook MP / bot Telegram).
export async function getItemPriceBRL(pacote: string): Promise<number | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("price_brl")
      .eq("pacote", pacote)
      .maybeSingle();
    const v = Number((data as any)?.price_brl);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

// Resolve categoria a partir do prefixo do pacote (usado no checkout).
export function categoryFromPacote(pacote: string): Category | null {
  const p = pacote.toLowerCase();
  if (p.startsWith("tgc")) return "telegram:canal";
  if (p.startsWith("tgg")) return "telegram:grupo";
  if (p.startsWith("wbr")) return "trafego:br";
  if (p.startsWith("wgl")) return "trafego:global";
  if (p.startsWith("ff"))  return "facebook:seguidores";
  if (p.startsWith("fl"))  return "facebook:curtidas";
  if (p.startsWith("ys"))  return "youtube:inscritos";
  if (p.startsWith("yv"))  return "youtube:visualizacoes";
  if (p.startsWith("tf"))  return "tiktok:seguidores";
  if (p.startsWith("tl"))  return "tiktok:curtidas";
  if (p.startsWith("tv"))  return "tiktok:visualizacoes";
  if (p.startsWith("l"))   return "instagram:curtidas";
  if (p.startsWith("v"))   return "instagram:visualizacoes";
  if (p.startsWith("p"))   return "instagram:seguidores";
  return null;
}
