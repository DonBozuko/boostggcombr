// Server-only pricing engine. Lê custo/1000 do SMMhype, aplica multiplicadores
// de margem progressiva High-CAC. Em qualquer falha cai no FALLBACK_RATES.
// NÃO importar de módulos client-reachable em escopo de módulo.

import { resolveServiceId, resolveServiceIdAsync } from "./smmhype.server";
import { guardBindings } from "./bind-guard.server";
import { costTierMult } from "./margin-guardian";
import { chooseBoundServiceId } from "./bind-authority";




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
  | "trafego:global"
  | "kwai:seguidores"
  | "kwai:curtidas"
  | "kwai:visualizacoes";

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

// v107 — Strict 200-Package Dynamic Matrix
// IG 60 (25+20+15) · TT 40 (20+12+8) · YT 40 (20+20) · FB/TG 40 (12+8+10+10) · Tráfego 20 (10+10)
const IG_SEG_QTYS = [50,100,150,200,300,400,500,750,1000,1500,2000,3000,4000,5000,7500,10000,15000,20000,30000,50000,75000,100000,200000,350000,500000];
const IG_LIKE_QTYS = [50,100,200,300,500,750,1000,1500,2000,3000,4000,5000,7500,10000,15000,20000,30000,50000,75000,100000];
const IG_VIEW_QTYS = [1000,2500,5000,10000,15000,25000,50000,75000,100000,200000,300000,500000,750000,1000000,2000000];
const TT_SEG_QTYS  = [100,200,300,500,750,1000,1500,2000,3000,5000,7500,10000,15000,20000,30000,50000,75000,100000,200000,500000];
const TT_LIKE_QTYS = [100,250,500,1000,2000,5000,10000,20000,50000,100000,200000,500000];
const TT_VIEW_QTYS = [1000,5000,10000,25000,50000,100000,250000,500000];
const YT_SUB_QTYS  = [50,100,200,300,500,750,1000,1500,2000,3000,4000,5000,7500,10000,15000,20000,30000,50000,75000,100000];
const YT_VIEW_QTYS = [1000,2000,5000,10000,15000,25000,50000,75000,100000,150000,200000,300000,500000,750000,1000000,1500000,2000000,3000000,5000000,10000000];
const FB_SEG_QTYS  = [100,250,500,1000,2000,3000,5000,10000,20000,50000,100000,200000];
const FB_LIKE_QTYS = [100,500,1000,2500,5000,10000,25000,50000];
const TG_CANAL_QTYS = [100,250,500,1000,2000,3000,5000,10000,25000,50000];
const TG_GRUPO_QTYS = [100,250,500,1000,2000,3000,5000,10000,25000,50000];
const TRAF_GL_QTYS  = [1000,2500,5000,10000,25000,50000,75000,100000,200000,500000];
// v210 — Kwai (SMMhype). Foco em BR: seguidores/curtidas/views.
const KW_SEG_QTYS   = [100,250,500,1000,2000,3000,5000,10000,20000,50000,100000];
const KW_LIKE_QTYS  = [100,500,1000,2500,5000,10000,25000,50000,100000];
const KW_VIEW_QTYS  = [1000,5000,10000,25000,50000,100000,250000,500000,1000000];

const CANONICAL_QTYS: Record<Category, Array<{ id: string; qty: number }>> = {
  "instagram:seguidores":    IG_SEG_QTYS.map((q) => pid("p", q)),
  "instagram:curtidas":      IG_LIKE_QTYS.map((q) => pid("l", q)),
  "instagram:visualizacoes": IG_VIEW_QTYS.map((q) => pid("v", q)),
  "tiktok:seguidores":       TT_SEG_QTYS.map((q) => pid("tf", q)),
  "tiktok:curtidas":         TT_LIKE_QTYS.map((q) => pid("tl", q)),
  "tiktok:visualizacoes":    TT_VIEW_QTYS.map((q) => pid("tv", q)),
  "youtube:inscritos":       YT_SUB_QTYS.map((q) => pid("ys", q)),
  "youtube:visualizacoes":   YT_VIEW_QTYS.map((q) => pid("yv", q)),
  "facebook:seguidores":     FB_SEG_QTYS.map((q) => pid("ff", q)),
  "facebook:curtidas":       FB_LIKE_QTYS.map((q) => pid("fl", q)),
  "telegram:canal":          TG_CANAL_QTYS.map((q) => pid("tgc", q)),
  "telegram:grupo":          TG_GRUPO_QTYS.map((q) => pid("tgg", q)),
  "trafego:global":          TRAF_GL_QTYS.map((q) => pid("wgl", q)),
  "kwai:seguidores":         KW_SEG_QTYS.map((q) => pid("kf", q)),
  "kwai:curtidas":           KW_LIKE_QTYS.map((q) => pid("kl", q)),
  "kwai:visualizacoes":      KW_VIEW_QTYS.map((q) => pid("kv", q)),
};

// v126 — total canônico local (fallback quando pricing_items retorna vazio)
export const CANONICAL_TOTAL = Object.values(CANONICAL_QTYS)
  .reduce((s, a) => s + a.length, 0);


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
  "trafego:global":          { pacote: "wgl1k", qty: 1000 },
  "kwai:seguidores":         { pacote: "kf1k", qty: 1000 },
  "kwai:curtidas":           { pacote: "kl1k", qty: 1000 },
  "kwai:visualizacoes":      { pacote: "kv1k", qty: 1000 },
};

// Hardcoded Financial Fallback Core v50-Patch — custos BRL/1000 salvos no código.
// Base de contingência: R$ 1,28 por 100 ações (= R$ 12,80/1000), ajustada por categoria.
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
  "trafego:global":           2.0,
  "kwai:seguidores":          5.5,
  "kwai:curtidas":            3.0,
  "kwai:visualizacoes":       2.7,
};

const USD_TO_BRL = 7.0;
const CONTINGENCY_SOURCE = "fallback" as const;

// v173 — Equação Fabiano Tiered. Fórmula:
//   preço = (custo * FABIANO_PROFIT * tierFactor(qty) * COUPON + PIX_FIXED) / PIX_NET
// FABIANO_PROFIT continua sendo o piso 5.0 (trigger DB enforce_pricing_markup);
// o escalonamento vem de tierFactor(qty) — desconto PRIME15 preservado no
// COUPON e margem compensada por faixa.
let FABIANO_PROFIT = 5.0; // base — trigger DB usa este piso
let FABIANO_COUPON = 1.15;
let FABIANO_PIX_NET = 0.9901;
let FABIANO_PIX_FIXED = 0.49;
let FLOOR_BASE = 5.0;

function tierFactor(qty: number): number {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 500) return 1.0;   // 5.0x  — isca
  if (q <= 5_000) return 1.6;                         // 8.0x  — sweet spot
  if (q <= 15_000) return 1.6 + ((q - 5000) / 10000) * 0.8; // rampa 8x→12x
  return 2.4;                                         // 12.0x — premium
}


async function primeConfig(): Promise<void> {
  try {
    const { getPricingConfig } = await import("./pricing-config.server");
    const cfg = await getPricingConfig();
    FABIANO_PROFIT = cfg.profit_multiplier;
    FABIANO_COUPON = cfg.coupon_buffer;
    FABIANO_PIX_NET = cfg.gateway_net;
    FABIANO_PIX_FIXED = cfg.gateway_fixed;
    FLOOR_BASE = cfg.floor_brl;
  } catch { /* mantém defaults */ }
}

const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step;

function floorFor(qty: number): number {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 500) return FLOOR_BASE;
  return FLOOR_BASE + ((q - 500) / 1000) * 2.0;
}

function packageCostFromRate(qty: number, costPer1k: number): number {
  return (qty / 1000) * costPer1k;
}

// v307 — PREÇO-SEMENTE. Usado UMA vez, só quando o pacote ainda não existe no
// banco, para a linha nascer válida. A Autoridade Única reprecifica no mesmo
// ciclo. Nunca é aplicado sobre pacote existente (ver preserveAuthorityPrice).
function seedPriceFromCost(qty: number, costBrl: number): number {
  // v328 — o teto de markup por custo também vale na semente, senão o pacote
  // nasce com preço de vitrine morta e só normaliza ciclos depois.
  const mult = Math.min(FABIANO_PROFIT * tierFactor(qty), costTierMult(costBrl));
  const raw = (costBrl * mult * FABIANO_COUPON + FABIANO_PIX_FIXED) / FABIANO_PIX_NET;
  return Math.max(floorFor(qty), ceilTo(raw, 0.5));
}




function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

// v50 — JSON Response Sanitizer Matrix. Lê services de qualquer panel SMM
// (SMMhype/SMMPainel/Verified) sem nunca explodir em "Unable to ... not valid JSON".
async function safeFetchProviderServices(
  endpoint: string,
  apiKey: string,
  timeoutMs = 8000,
): Promise<Array<{ service: number | string; rate: string | number }> | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      console.warn(`[pricing] provider ${endpoint} HTTP ${res.status}`);
      return null;
    }
    const raw = await res.text();
    const trimmed = raw.trim();
    if (!trimmed || (trimmed[0] !== "[" && trimmed[0] !== "{")) {
      console.warn(`[pricing] provider ${endpoint} non-JSON body (len=${trimmed.length})`);
      return null;
    }
    let parsed: unknown;
    try { parsed = JSON.parse(trimmed); } catch (e) {
      console.warn(`[pricing] provider ${endpoint} JSON.parse failed:`, (e as Error).message);
      return null;
    }
    return Array.isArray(parsed) ? (parsed as any) : null;
  } catch (e) {
    console.warn(`[pricing] provider ${endpoint} fetch error:`, (e as Error).message);
    return null;
  }
}

// v50.1 — Isolation registry: provedores instáveis ficam marcados em pricing_cache
// como linhas-sentinela `_unstable:<provider>` com TTL de 30min.
const UNSTABLE_TTL_MS = 30 * 60 * 1000;
const MIN_HEALTHY_SERVICES = 50; // panel saudável devolve centenas

async function readUnstableProviders(): Promise<Set<string>> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pricing_cache" as any)
      .select("category, synced_at")
      .like("category", "_unstable:%");
    const now = Date.now();
    const out = new Set<string>();
    for (const row of (data ?? []) as Array<any>) {
      const t = new Date(row.synced_at).getTime();
      if (Number.isFinite(t) && now - t < UNSTABLE_TTL_MS) {
        out.add(String(row.category).replace("_unstable:", ""));
      }
    }
    return out;
  } catch { return new Set(); }
}

async function markUnstable(name: string, reason: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("pricing_cache" as any).upsert(
      [{
        category: `_unstable:${name}`,
        cost_per_1k_brl: 0,
        source: reason.slice(0, 60),
        synced_at: new Date().toISOString(),
      }],
      { onConflict: "category" },
    );
    console.warn(`[pricing] provider isolado: ${name} (${reason})`);
  } catch { /* noop */ }
}

// Multi-Provider Fallback Core v50.1 — SMMhype → SMMPainel → Verified com
// isolamento persistente. Provedor com JSON inválido / IDs corrompidos é
// removido da rotação por 30min; sistema cai em FALLBACK_RATES_PER_1K.
async function loadProviderRateMap(): Promise<{
  rateById: Map<number, number>;
  // v359 — faixa min/max viva: sem ela não dá para saber se o vínculo atual
  // entrega a quantidade do pacote.
  rangeById: Map<number, { min?: number; max?: number }>;
  provider: "smmhype" | "smmpanel" | "verified" | "none";
}> {

  const providers: Array<{ name: "smmhype" | "smmpanel" | "verified"; url: string; key: string | undefined }> = [
    { name: "smmhype",  url: "https://smmhype.com/api/v2",   key: process.env.SMMHYPE_API_KEY },
    { name: "smmpanel", url: "https://smmpainel.com/api/v2", key: process.env.SMMPAINEL_API_KEY },
    { name: "verified", url: "https://verifiedatacado.com/api/v2", key: process.env.VERIFIED_API_KEY },
  ];

  // v67 — Perpetual Balance Force: provedores com saldo real ATIVO nunca são
  // isolados. O Smart Cost Routing decide o desvio em runtime, mas o cache
  // de pricing precisa manter o provedor disponível enquanto houver saldo.
  const balanceMap = new Map<string, number>();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("fornecedores")
      .select("slug, saldo_atual, ativo");
    for (const f of (data ?? []) as Array<any>) {
      if (f?.ativo && Number(f.saldo_atual) > 0) {
        balanceMap.set(String(f.slug), Number(f.saldo_atual));
      }
    }
  } catch { /* noop */ }

  const unstable = await readUnstableProviders();
  for (const p of providers) {
    if (!p.key) continue;
    const hasBalance = (balanceMap.get(p.name) ?? 0) > 0;
    if (unstable.has(p.name) && !hasBalance) {
      console.warn(`[pricing] pulando ${p.name} (isolado em pricing_cache)`);
      continue;
    }
    const list = await safeFetchProviderServices(p.url, p.key);
    if (!list) {
      if (!hasBalance) await markUnstable(p.name, "invalid_json_or_http");
      else console.warn(`[pricing] ${p.name} instável mas mantido ATIVO (saldo>0)`);
      continue;
    }
    if (list.length < MIN_HEALTHY_SERVICES) {
      if (!hasBalance) await markUnstable(p.name, `low_service_count:${list.length}`);
      continue;
    }
    const map = new Map<number, number>();
    const ranges = new Map<number, { min?: number; max?: number }>();
    for (const s of list) {
      const id = Number((s as any).service);
      const r = Number((s as any).rate);
      if (Number.isFinite(id) && Number.isFinite(r) && r > 0) map.set(id, r);
      if (Number.isFinite(id)) {
        const min = Number((s as any).min);
        const max = Number((s as any).max);
        ranges.set(id, {
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
        });
      }
    }
    if (map.size < MIN_HEALTHY_SERVICES) {
      if (!hasBalance) await markUnstable(p.name, `corrupt_ids:${map.size}`);
      continue;
    }
    console.log(`[pricing] provider ativo: ${p.name} (${map.size} serviços)`);
    return { rateById: map, rangeById: ranges, provider: p.name };
  }
  return { rateById: new Map(), rangeById: new Map(), provider: "none" };

}

async function fetchSmmRatePer1kBRL(category: Category): Promise<number | null> {
  const probe = PROBE[category];
  const serviceId = await resolveServiceIdAsync(probe.pacote, probe.qty).catch(() => null);
  if (!serviceId) return null;
  const { rateById } = await loadProviderRateMap();
  const rateUsd = rateById.get(serviceId);
  if (!Number.isFinite(rateUsd) || !rateUsd || rateUsd <= 0) return null;
  return rateUsd * USD_TO_BRL;
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

type PricingItemRow = {
  pacote: string;
  category: Category;
  quantidade: number;
  provider_service_id: number | null;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
  cost_brl: number;
  price_brl: number;
  source: "api" | "fallback";
  synced_at: string;
};

// v292 — Trava de escada: nenhum pacote maior pode sair mais barato que o
// menor da mesma categoria. Só empurra preço PRA CIMA (nunca corta margem).
// v307 — Faxina: este motor NÃO mexe mais em preço de pacote que já existe.
// Ele grava custo e IDs; o preço de linha já existente é preservado exatamente
// como está no banco e só a Autoridade Única (price-authority.server.ts) o
// altera, no fim do ciclo. Pacote novo entra com o preço-semente e a Autoridade
// o corrige no mesmo ciclo. Escada monotônica também é da Autoridade.
function preserveAuthorityPrice(rows: PricingItemRow[], existing: Map<string, ExistingItem>): PricingItemRow[] {
  let kept = 0;
  const out = rows.map((r) => {
    const old = existing.get(r.pacote);
    if (!old || !(old.price_brl > 0)) return r;
    if (Math.abs(old.price_brl - r.price_brl) > 0.009) kept += 1;
    return { ...r, price_brl: old.price_brl };
  });
  if (kept > 0) {
    console.log(`[pricing] v307 preço preservado (autoridade decide) em ${kept} pacote(s)`);
  }
  return out;
}


function buildContingencyPricingRows(now = new Date().toISOString()): {
  itemRows: PricingItemRow[];
  summaryRows: Array<{ category: Category; cost_per_1k_brl: number; source: "fallback"; synced_at: string }>;
  results: Array<{ category: Category; cost: number; source: "fallback" }>;
} {
  const itemRows: PricingItemRow[] = [];
  const summaryRows: Array<{ category: Category; cost_per_1k_brl: number; source: "fallback"; synced_at: string }> = [];
  const results: Array<{ category: Category; cost: number; source: "fallback" }> = [];

  for (const cat of Object.keys(CANONICAL_QTYS) as Category[]) {
    const costPer1k = FALLBACK_RATES_PER_1K[cat];
    for (const { id, qty } of CANONICAL_QTYS[cat]) {
      const costBrl = packageCostFromRate(qty, costPer1k);
      const sid = resolveServiceId(id, qty);
      const sidStr = sid != null ? String(sid) : null;
      itemRows.push({
        pacote: id,
        category: cat,
        quantidade: qty,
        provider_service_id: sid,
        // v111 — Strict Automated Database Alignment:
        // apenas o ID primário (SMMhype) é conhecido pela matriz.
        // Panel/Verified permanecem NULL até que um mapeamento real
        // seja cadastrado via PricingCatalogEditor / service_id_overrides.
        smmhype_service_id: sidStr,
        smmpanel_service_id: null,
        verified_service_id: null,
        cost_brl: Number(costBrl.toFixed(4)),
        price_brl: Number(seedPriceFromCost(qty, costBrl).toFixed(2)),
        source: CONTINGENCY_SOURCE,
        synced_at: now,
      });
    }
    summaryRows.push({
      category: cat,
      cost_per_1k_brl: Number(costPer1k.toFixed(4)),
      source: CONTINGENCY_SOURCE,
      synced_at: now,
    });
    results.push({ category: cat, cost: costPer1k, source: CONTINGENCY_SOURCE });
  }
  return { itemRows, summaryRows, results };
}



// v330 — pausa DURA: motivo sem fornecedor habilitado nunca volta pra vitrine.
// Sem fornecedor vinculado não existe entrega possível — mostrar o card só gera
// Pix pago sem entrega e estorno.
const HARD_PAUSE = /nenhum fornecedor|sem fornecedor/i;

// v47 — lê itens já precificados 1:1 do pricing_items.
async function readCachedItems(category: Category): Promise<Map<string, { cost: number; price: number; source: "api" | "fallback"; sellable: boolean; hardBlocked: boolean }>> {
  const out = new Map<string, { cost: number; price: number; source: "api" | "fallback"; sellable: boolean; hardBlocked: boolean }>();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, cost_brl, price_brl, source, is_sellable, last_dry_run, sellable_reason")
      .eq("category", category);
    for (const row of (data ?? []) as Array<any>) {
      // v290 — só confia na pausa se o teste seco rodou nas últimas 48h.
      // Teste velho não tira produto da prateleira (evita vitrine vazia por cron parado).
      const dr = row.last_dry_run ? Date.parse(row.last_dry_run) : 0;
      const recente = dr > 0 && Date.now() - dr < 48 * 60 * 60 * 1000;
      out.set(String(row.pacote), {
        cost: Number(row.cost_brl) || 0,
        price: Number(row.price_brl) || 0,
        source: row.source === "api" ? "api" : "fallback",
        sellable: recente ? row.is_sellable !== false : true,
        hardBlocked: row.is_sellable === false && HARD_PAUSE.test(String(row.sellable_reason ?? "")),
      });
    }
  } catch {
    /* ignora — cai no fallback de fórmula */
  }
  return out;
}



type ExistingItem = {
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
  cost_brl: number;
  price_brl: number;
  last_cost_source: string | null;
};

async function readExistingReserveIds(): Promise<Map<string, ExistingItem>> {
  const out = new Map<string, ExistingItem>();
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, smmhype_service_id, smmpanel_service_id, verified_service_id, cost_brl, price_brl, last_cost_source");
    for (const row of (data ?? []) as Array<any>) {
      out.set(String(row.pacote), {
        smmhype_service_id: row.smmhype_service_id ? String(row.smmhype_service_id) : null,
        smmpanel_service_id: row.smmpanel_service_id ? String(row.smmpanel_service_id) : null,
        verified_service_id: row.verified_service_id ? String(row.verified_service_id) : null,
        cost_brl: Number(row.cost_brl ?? 0),
        price_brl: Number(row.price_brl ?? 0),
        last_cost_source: row.last_cost_source ? String(row.last_cost_source) : null,
      });
    }
  } catch { /* noop */ }
  return out;
}

/**
 * v359 — o vínculo gravado no banco manda; o ID da matriz do código é semente.
 * Sem isso, toda sincronização desfazia a escolha do dono no admin e o pacote
 * voltava para um fornecedor que não entrega a quantidade (loop de alerta).
 */
function preserveLiveBoundId(
  rows: PricingItemRow[],
  existing: Map<string, ExistingItem>,
  rangeById: Map<number, { min?: number; max?: number }>,
  rateById: Map<number, number>,
): PricingItemRow[] {
  return rows.map((r) => {
    const old = existing.get(r.pacote);
    if (!old?.smmhype_service_id) return r;
    const escolhido = chooseBoundServiceId({
      candidate: r.smmhype_service_id,
      existing: old.smmhype_service_id,
      qty: Number(r.quantidade),
      ranges: rangeById,
    });
    if (escolhido === r.smmhype_service_id) return r;
    const n = Number(escolhido);
    const out: PricingItemRow = {
      ...r,
      smmhype_service_id: escolhido,
      provider_service_id: Number.isFinite(n) ? n : r.provider_service_id,
    };
    // O custo tem de vir de QUEM entrega: trocou o ID, recalcula a tarifa.
    const usdPer1k = Number.isFinite(n) ? rateById.get(n) : undefined;
    if (typeof usdPer1k === "number" && usdPer1k > 0) {
      const cost = (Number(r.quantidade) / 1000) * usdPer1k * USD_TO_BRL;
      out.cost_brl = Number(cost.toFixed(4));
      out.price_brl = Number(seedPriceFromCost(Number(r.quantidade), cost).toFixed(2));
      out.source = "api";
    }
    return out;
  });
}


function preserveReserveIds(rows: PricingItemRow[], existing: Map<string, ExistingItem>): PricingItemRow[] {
  return rows.map((r) => {
    const old = existing.get(r.pacote);
    if (!old) return r;
    return {
      ...r,
      smmpanel_service_id: r.smmpanel_service_id ?? old.smmpanel_service_id,
      verified_service_id: r.verified_service_id ?? old.verified_service_id,
    };

  });
}

// v304 — PONTO ÚNICO DE VERDADE DO PREÇO.
//
// Dois motores gravavam price_brl no mesmo ciclo com bases de custo diferentes:
// este (custo do fornecedor canônico por categoria) e o reserve sync
// (menor custo real entre os 4 fornecedores, gravado em last_cost_source).
// O resultado era ping-pong: 235 de 281 pacotes mudavam de preço por ciclo,
// estourando o freio de massa e desfazendo as correções de escada.
//
// Regra: quando o reserve sync já achou um custo REAL igual ou mais barato,
// esse custo manda. Este motor não sobrescreve. Nunca aumenta o preço para o
// cliente — só evita reescrever por cima de uma leitura melhor.
function preserveCheaperRealCost(rows: PricingItemRow[], existing: Map<string, ExistingItem>): PricingItemRow[] {
  let kept = 0;
  const out = rows.map((r) => {
    const old = existing.get(r.pacote);
    if (!old || !old.last_cost_source) return r;
    if (!(old.cost_brl > 0) || !(old.price_brl > 0)) return r;
    if (old.cost_brl > r.cost_brl) return r; // nosso custo é melhor: pode gravar
    kept += 1;
    return { ...r, cost_brl: old.cost_brl, price_brl: old.price_brl };
  });
  if (kept > 0) console.log(`[pricing] v304 manteve custo real do fornecedor em ${kept} pacote(s)`);
  return out;
}



export async function getPricingGridImpl(category: Category): Promise<PricingGridResult> {
  // v307 — Faxina: a vitrine é ESPELHO do banco, não uma calculadora.
  // Quem decide preço é `price-authority.server.ts` (v305/v306). Aqui não se
  // aplica piso, escada nem markup: se o pacote não tem preço real no banco,
  // ele simplesmente não existe na vitrine (prateleira honesta v290).
  await primeConfig();
  const itemsMap = await readCachedItems(category);
  let anyApi = false;

  const rawItems: GridItem[] = [];
  for (const { id, qty } of CANONICAL_QTYS[category]) {
    const hit = itemsMap.get(id);
    if (!hit || !(hit.price > 0)) continue;
    if (hit.source === "api") anyApi = true;
    rawItems.push({ id, quantidade: qty, valor: hit.price, price: formatBRL(hit.price) });
  }

  // v290 — prateleira honesta: pacote que o teste seco marcou como não vendável
  // some da vitrine, em vez de aparecer e travar no checkout. Se TODOS sumiriam,
  // mantém a lista (provável falso positivo) — o checkout ainda barra e alerta.
  // v330 — exceção: pausa dura (sem fornecedor habilitado) nunca volta.
  const disponiveis = rawItems.filter((it) => itemsMap.get(it.id)?.sellable !== false);
  const semBloqueioDuro = rawItems.filter((it) => itemsMap.get(it.id)?.hardBlocked !== true);
  const visiveis = disponiveis.length > 0 ? disponiveis : semBloqueioDuro;

  const items = [...visiveis].sort((a, b) => a.quantidade - b.quantidade);

  const source: "api" | "fallback" = anyApi ? "api" : "fallback";


  return {
    category,
    source,
    
    items,
    generated_at: new Date().toISOString(),
  };
}

// v47 — sincroniza TODOS os ~200 cards (1 chamada services + 1 resolver por card).
export async function syncPricingCacheAll(options: { forceContingency?: boolean } = {}): Promise<{
  ok: boolean;
  updated: number;
  results: Array<{ category: Category; cost: number; source: "api" | "fallback" }>;
  mode?: "api" | "contingency";
}> {
  await primeConfig();
  const { purgePricingCacheMemory } = await import("@/lib/pricing-cache.server");
  purgePricingCacheMemory("syncPricingCacheAll:start");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const existingReserveIds = await readExistingReserveIds();

  // v50 — Multi-Provider Fallback Core. JSON-sanitizado, com failover automático.
  // v50-Patch: forceContingency ignora rede e popula tudo pela matriz local.
  const { rateById, rangeById, provider } = options.forceContingency
    ? { rateById: new Map<number, number>(), rangeById: new Map<number, { min?: number; max?: number }>(), provider: "none" as const }
    : await loadProviderRateMap();

  console.log(`[pricing] sync provider=${provider} services=${rateById.size}`);


  const cats = Object.keys(CANONICAL_QTYS) as Category[];
  let itemRows: PricingItemRow[] = [];
  const catSummary: Array<{ category: Category; cost: number; source: "api" | "fallback" }> = [];

  const now = new Date().toISOString();

  if (provider === "none" || rateById.size === 0) {
    console.warn("[pricing] todos os provedores externos falharam; ativando contingência local hermética");
    const contingency = buildContingencyPricingRows(now);
    itemRows = preserveAuthorityPrice(preserveCheaperRealCost(preserveLiveBoundId(preserveReserveIds(contingency.itemRows, existingReserveIds), existingReserveIds, rangeById), existingReserveIds), existingReserveIds);
    // v320 — a contingência escreve IDs chumbados no código. Se o fornecedor
    // reaproveitou o número para outro produto, o portão zera antes de gravar.
    itemRows = (await guardBindings(itemRows)).rows;
    const { error: e1 } = await supabaseAdmin
      .from("pricing_items" as any)
      .upsert(itemRows, { onConflict: "pacote" });

    const { error: e2 } = await supabaseAdmin
      .from("pricing_cache" as any)
      .upsert([
        ...contingency.summaryRows,
        {
          category: "_contingency:v50-patch",
          cost_per_1k_brl: 12.8,
          source: "all_providers_failed_local_matrix",
          synced_at: now,
        },
      ], { onConflict: "category" });
    try {
      const { syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
      const rep = await syncReserveProviderIds();
      console.log("[pricing] v137 reserve live handshake", rep);
    } catch (e) { console.warn("[pricing] v137 reserve live handshake fail", e); }
    try {
      const { enforcePriceAuthority } = await import("@/lib/price-authority.server");
      await enforcePriceAuthority("pos-sync-contingencia");
    } catch (e) { console.warn("[pricing] v304 escada final fail", e); }
    purgePricingCacheMemory("syncPricingCacheAll:contingency:end");
    return { ok: !e1 && !e2, updated: itemRows.length, results: contingency.results, mode: "contingency" };
  }

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
      const price_brl = seedPriceFromCost(qty, cost_brl);
      const sidStr = serviceId != null ? String(serviceId) : null;
      itemRows.push({
        pacote: id, category: cat, quantidade: qty,
        provider_service_id: serviceId ?? null,
        // v111 — Não duplica o ID do SMMhype nas colunas de reserva.
        smmhype_service_id: sidStr,
        smmpanel_service_id: null,
        verified_service_id: null,
        cost_brl: Number(cost_brl.toFixed(4)),
        price_brl: Number(price_brl.toFixed(2)),
        source, synced_at: now,
      });
    }
    catSummary.push({ category: cat, cost: catCostPer1k, source: catSource });
  }

  // Upsert em pricing_items (1:1) + pricing_cache (resumo por categoria, retrocompat)
  itemRows = preserveAuthorityPrice(preserveCheaperRealCost(preserveLiveBoundId(preserveReserveIds(itemRows, existingReserveIds), existingReserveIds, rangeById), existingReserveIds), existingReserveIds);
  // v320 — portão único de vínculo antes de qualquer escrita de ID.
  itemRows = (await guardBindings(itemRows)).rows;
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

  // v130 — Auto-Provider Mapping: preenche IDs reserva (SMMPanel/Verified) por paridade de catálogo.
  try {
    const { syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
    const rep = await syncReserveProviderIds();
    console.log("[pricing] v137 reserve live handshake", rep);
  } catch (e) { console.warn("[pricing] v137 reserve live handshake fail", e); }

  // v274 — Recusto pelo fornecedor de reserva.
  // CAUSA RAIZ do p15k a R$2.509: quando o fornecedor primário (SMMhype) não
  // tem o serviço, o motor caía na tabela FALLBACK (ex.: R$12/1k) mesmo com um
  // fornecedor de reserva vendendo o mesmo pacote por R$1,91/1k. Resultado:
  // custo fantasma inflado e preço de vitrine absurdo. Agora, todo item em
  // 'fallback' que tenha ID de reserva com tarifa real usa a tarifa real.
  try {
    const rec = await recostFromReserves();
    console.log("[pricing] v274 recost from reserves", rec);
  } catch (e) { console.warn("[pricing] v274 recost fail", e); }

  // v304 — última palavra: escada monotônica sobre o estado REAL do banco,
  // depois de todos os motores gravarem.
  try {
    const { enforcePriceAuthority } = await import("@/lib/price-authority.server");
    await enforcePriceAuthority("pos-sync-live");
  } catch (e) { console.warn("[pricing] v304 escada final fail", e); }

  purgePricingCacheMemory("syncPricingCacheAll:end");

  return { ok: !e1 && !e2, updated: itemRows.length, results: catSummary, mode: "api" };
}

/**
 * v274 — Corrige itens precificados por fallback quando existe tarifa real de
 * um fornecedor de reserva (SMMPainel / Verified, ambos em BRL).
 * Só age para BAIXO ou quando o custo fantasma diverge >10% do real — nunca
 * encarece o site por conta própria.
 */
export async function recostFromReserves(): Promise<{
  checked: number;
  fixed: number;
  items: Array<{ pacote: string; de: number; para: number }>;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: items } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, quantidade, cost_brl, price_brl, source, smmpanel_service_id, verified_service_id")
    .eq("source", "fallback");

  const rows = (items ?? []) as Array<Record<string, any>>;
  if (!rows.length) return { checked: 0, fixed: 0, items: [] };

  const { serviceAcceptsQty } = await import("@/lib/critical-guards");
  const [{ data: sp }, { data: vf }] = await Promise.all([
    supabaseAdmin.from("smmpanel_services_cache" as any).select("provider_service_id, rate, min, max"),
    supabaseAdmin.from("verified_services_cache" as any).select("provider_service_id, rate, min, max"),
  ]);
  type Svc = { rate: number; min?: number | string | null; max?: number | string | null };
  const svcSp = new Map<string, Svc>();
  for (const r of (sp ?? []) as any[]) svcSp.set(String(r.provider_service_id), { rate: Number(r.rate), min: r.min, max: r.max });
  const svcVf = new Map<string, Svc>();
  for (const r of (vf ?? []) as any[]) svcVf.set(String(r.provider_service_id), { rate: Number(r.rate), min: r.min, max: r.max });

  const fixed: Array<{ pacote: string; de: number; para: number }> = [];
  for (const row of rows) {
    const qty = Number(row.quantidade) || 0;
    if (qty <= 0) continue;
    // v358 — CAUSA RAIZ do loop "PACOTE APOSENTADO" em p350k/p500k: o recusto
    // pegava a tarifa de um serviço de reserva com TETO menor que o pacote
    // (smmpanel #52, max 200k, usado em pacote de 350k/500k). O custo baixava
    // sozinho, o ciclo seguinte lia o custo real de quem entrega, via um salto
    // de 4x e aposentava o pacote — de novo, e de novo. Mesma trava do
    // despacho (v351): custo só vale de quem entrega a quantidade.
    const candidatos = [svcSp.get(String(row.smmpanel_service_id ?? "")), svcVf.get(String(row.verified_service_id ?? ""))]
      .filter((s): s is Svc => !!s && Number.isFinite(s.rate) && s.rate > 0)
      .filter((s) => serviceAcceptsQty(s, qty));
    const rate = candidatos.length ? Math.min(...candidatos.map((s) => s.rate)) : 0;
    if (!Number.isFinite(rate) || !rate || rate <= 0) continue;

    const realCost = (qty / 1000) * (rate as number);
    const oldCost = Number(row.cost_brl) || 0;
    // Ignora divergência pequena (ruído de câmbio/arredondamento).
    if (oldCost > 0 && Math.abs(realCost - oldCost) / oldCost < 0.1) continue;
    // Nunca encarece a vitrine sozinho: só corrige quando o custo real é menor.
    if (oldCost > 0 && realCost > oldCost) continue;

    const newPrice = Number(row.price_brl) || 0; // v307: recost não move preço
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      // v305 — recusto grava só CUSTO. Preço é da autoridade única.
      .update({
        cost_brl: Number(realCost.toFixed(4)),
        last_cost_source: "reserve_recost_v274",
      })
      .eq("pacote", row.pacote);
    if (!error) fixed.push({ pacote: String(row.pacote), de: Number(row.price_brl) || 0, para: newPrice });
  }

  return { checked: rows.length, fixed: fixed.length, items: fixed };
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
  // v356 — trafego:br apagado do catálogo (sem fornecedor BR real). Pacote wbr* não existe mais.
  if (p.startsWith("wbr")) return null;
  if (p.startsWith("wgl")) return "trafego:global";
  if (p.startsWith("ff"))  return "facebook:seguidores";
  if (p.startsWith("fl"))  return "facebook:curtidas";
  if (p.startsWith("ys"))  return "youtube:inscritos";
  if (p.startsWith("yv"))  return "youtube:visualizacoes";
  if (p.startsWith("tf"))  return "tiktok:seguidores";
  if (p.startsWith("tl"))  return "tiktok:curtidas";
  if (p.startsWith("tv"))  return "tiktok:visualizacoes";
  if (p.startsWith("kf"))  return "kwai:seguidores";
  if (p.startsWith("kl"))  return "kwai:curtidas";
  if (p.startsWith("kv"))  return "kwai:visualizacoes";
  if (p.startsWith("l"))   return "instagram:curtidas";
  if (p.startsWith("v"))   return "instagram:visualizacoes";
  if (p.startsWith("p"))   return "instagram:seguidores";
  return null;
}
