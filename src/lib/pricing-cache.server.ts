// v130 — Cache in-memory + Auto-Mapper de IDs em provedores reserva (SMMPanel/Verified).
// Preserva HUD v57, cronômetro v105, MysteryBox v115, rolagem v122, rate-limit v129, Telegram v125.

type PricingRow = {
  pacote: string;
  quantidade: number;
  price_brl: number;
  cost_brl: number;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
};

let lastReserveSyncAt = 0;

export function purgePricingCacheMemory(reason = "v137-force-purge"): void {
  // v137 — sem cache estático: qualquer handshake força leitura viva do banco.
  lastReserveSyncAt = 0;
  console.log(`[pricing-cache] purge absoluto de cache em memória (${reason})`);
}

async function refresh(): Promise<Map<string, PricingRow>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, quantidade, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id");
  const map = new Map<string, PricingRow>();
  for (const r of ((data as any[]) ?? [])) map.set(String(r.pacote), r as PricingRow);
  return map;
}

export async function getPricingRow(pacote: string): Promise<PricingRow | null> {
  const map = await refresh();
  return map.get(pacote) ?? null;
}

export async function primePricingCache(): Promise<void> {
  await refresh();
}

// ============================================================
// v130 — Strict Auto-Provider Mapping Alignment
// ============================================================

type RemoteService = {
  service: number | string;
  name: string;
  category?: string;
  rate: number | string;
  min?: number | string;
  max?: number | string;
};

export const RESERVE_PROVIDER_ENDPOINTS = {
  smmhype: "https://smmhype.com/api/v2",
  smmpanel: "https://smmpainel.com/api/v2",
  verified: "https://verifiedatacado.com/api/v2",
} as const;

async function fetchServiceCatalog(endpoint: string, apiKey: string): Promise<RemoteService[] | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json,text/plain,*/*",
          "User-Agent": "EliteBoostPrime-AutoMapper/134",
        },
        body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }
    if (!res.ok) return null;
    const txt = (await res.text()).trim();
    if (!txt || (txt[0] !== "[" && txt[0] !== "{")) return null;
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed as RemoteService[] : null;
  } catch { return null; }
}

function cleanId(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t ? t : null;
}

// Categoria canônica → tokens obrigatórios (todos precisam bater no name+category do serviço remoto).
// Também tokens negativos para descartar serviços que não servem (ex: subscribers p/ likes).
const CATEGORY_TOKENS: Record<string, { must: string[][]; not?: string[] }> = {
  "instagram:seguidores":    { must: [["instagram","insta"], ["follower","seguidor"]], not: ["like","view","comment","story","reel"] },
  "instagram:curtidas":      { must: [["instagram","insta"], ["like","curtida"]],     not: ["follower","view","comment"] },
  "instagram:visualizacoes": { must: [["instagram","insta"], ["view","visual","reel","story"]], not: ["follower","like","comment"] },
  "tiktok:seguidores":       { must: [["tiktok"], ["follower","seguidor"]], not: ["like","view"] },
  "tiktok:curtidas":         { must: [["tiktok"], ["like","curtida"]],      not: ["follower","view"] },
  "tiktok:visualizacoes":    { must: [["tiktok"], ["view","visual"]],       not: ["follower","like"] },
  "youtube:inscritos":       { must: [["youtube"], ["subscriber","inscrit"]], not: ["view","like","watch"] },
  "youtube:visualizacoes":   { must: [["youtube"], ["view","visual","watch"]], not: ["subscriber","like"] },
  "facebook:seguidores":     { must: [["facebook","fb"], ["follower","seguidor","page like","curtida de página"]], not: ["post like","view","comment"] },
  "facebook:curtidas":       { must: [["facebook","fb"], ["like","curtida"]], not: ["follower","view"] },
  "telegram:canal":          { must: [["telegram"], ["member","membro","channel","canal","group","grupo"]], not: ["view","visual","react"] },
  "telegram:grupo":          { must: [["telegram"], ["member","membro","channel","canal","group","grupo"]], not: ["view","visual","react"] },
  "trafego:br":              { must: [["traffic","tráfego","website","visitor","visita"]], not: ["instagram","tiktok","youtube","facebook","telegram"] },
  "trafego:global":          { must: [["traffic","tráfego","website","visitor","visita"]], not: ["instagram","tiktok","youtube","facebook","telegram"] },
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchesTokens(haystack: string, cat: string): boolean {
  const rules = CATEGORY_TOKENS[cat];
  if (!rules) return false;
  const h = normalize(haystack);
  for (const group of rules.must) {
    if (!group.some((t) => h.includes(normalize(t)))) return false;
  }
  if (rules.not?.some((t) => h.includes(normalize(t)))) return false;
  return true;
}

function pickBestMatch(services: RemoteService[], cat: string, qty: number): RemoteService | null {
  let best: RemoteService | null = null;
  let bestRate = Number.POSITIVE_INFINITY;
  for (const s of services) {
    const name = String(s.name ?? "") + " " + String(s.category ?? "");
    if (!matchesTokens(name, cat)) continue;
    const min = Number(s.min ?? 0);
    const max = Number(s.max ?? Number.POSITIVE_INFINITY);
    if (Number.isFinite(min) && qty < min) continue;
    if (Number.isFinite(max) && qty > max) continue;
    const rate = Number(s.rate);
    if (!Number.isFinite(rate) || rate <= 0) continue;
    if (rate < bestRate) { bestRate = rate; best = s; }
  }
  return best;
}

/**
 * v130 — Auto-map de IDs para provedores reserva (SMMPanel + Verified).
 * Cruza catálogo remoto contra pricing_items pela categoria + faixa min/max,
 * gravando smmpanel_service_id e verified_service_id apenas quando NULOS.
 * Retorna contagem de linhas preenchidas por provedor.
 */
export async function syncReserveProviderIds(): Promise<{
  smmhype_filled: number;
  smmpanel_filled: number;
  verified_filled: number;
  smmhype_catalog: number;
  smmpanel_catalog: number;
  verified_catalog: number;
  scanned: number;
  updated_rows: number;
}> {
  purgePricingCacheMemory("syncReserveProviderIds:start");
  return syncReserveProviderIdsNow({ force: true });
}

export async function ensureReserveProviderIdsFresh(staleMs = 30_000): Promise<void> {
  if (Date.now() - lastReserveSyncAt < staleMs) return;
  await syncReserveProviderIdsNow({ force: false }).then(() => {}, (e) => {
    console.warn("[pricing-cache] v134 auto-map lazy sync falhou", e);
  });
}

async function syncReserveProviderIdsNow(_opts: { force: boolean }): Promise<{
  smmhype_filled: number;
  smmpanel_filled: number;
  verified_filled: number;
  smmhype_catalog: number;
  smmpanel_catalog: number;
  verified_catalog: number;
  scanned: number;
  updated_rows: number;
}> {
  purgePricingCacheMemory(_opts.force ? "v137-force-live-handshake" : "v137-lazy-live-handshake");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { resolveServiceIdAsync } = await import("./smmhype.server");

  // v137 — handshake vivo nas 3 APIs, aguardado antes de renderizar qualquer linha.
  const hypeList = process.env.SMMHYPE_API_KEY
    ? await fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.smmhype, process.env.SMMHYPE_API_KEY)
    : null;
  const panelList = process.env.SMMPAINEL_API_KEY
    ? await fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.smmpanel, process.env.SMMPAINEL_API_KEY)
    : null;
  const verifiedList = process.env.VERIFIED_API_KEY
    ? await fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.verified, process.env.VERIFIED_API_KEY)
    : null;

  const { data: rows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, smmhype_service_id, smmpanel_service_id, verified_service_id")
    .order("category", { ascending: true })
    .order("quantidade", { ascending: true });

  let smmhype_filled = 0;
  let smmpanel_filled = 0;
  let verified_filled = 0;
  let updated_rows = 0;
  const perCategory: Record<string, { scanned: number; hype: number; panel: number; verified: number }> = {};

  // v136 — Varredura sequencial multi-categoria: agrupa linhas por categoria e
  // processa cada bucket em lote para eliminar falhas de cache parcial.
  const byCategory = new Map<string, any[]>();
  for (const r of ((rows as any[]) ?? [])) {
    const cat = String(r.category ?? "");
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(r);
  }

  for (const [cat, bucket] of byCategory) {
    perCategory[cat] = { scanned: bucket.length, hype: 0, panel: 0, verified: 0 };
    for (const r of bucket) {
      const qty = Number(r.quantidade);
      const set: Record<string, string> = { synced_at: new Date().toISOString() };
      const currentHype = cleanId(r.smmhype_service_id);

      const hypeMatch = hypeList ? pickBestMatch(hypeList, cat, qty) : null;
      const liveHypeId = cleanId(hypeMatch?.service) ?? cleanId(await resolveServiceIdAsync(String(r.pacote), qty).catch(() => null));
      if (liveHypeId && liveHypeId !== currentHype) {
        set.smmhype_service_id = liveHypeId;
      }
      const hype = cleanId(set.smmhype_service_id ?? currentHype);

      if (panelList) {
        const m = pickBestMatch(panelList, cat, qty);
        const id = cleanId(m?.service);
        const current = cleanId(r.smmpanel_service_id);
        if (id && id !== hype && current !== id) {
          set.smmpanel_service_id = id;
        }
      }
      if (verifiedList) {
        const m = pickBestMatch(verifiedList, cat, qty);
        const id = cleanId(m?.service);
        const current = cleanId(r.verified_service_id);
        // v136 — Isolamento tripartite: nunca escrever verified == hype nem verified == panel proposto/atual.
        const panelClash = cleanId(set.smmpanel_service_id ?? r.smmpanel_service_id);
        if (id && id !== hype && id !== panelClash && current !== id) {
          set.verified_service_id = id;
        }
      }

      // v137 — gravação imediata linha-a-linha; sem lote pendente e sem cache parcial.
      if (Object.keys(set).length > 1) {
        const { error } = await supabaseAdmin.from("pricing_items" as any).update(set).eq("pacote", r.pacote);
        if (error) {
          console.error("[pricing-cache] v137 UPDATE vivo falhou", { pacote: r.pacote, error: error.message });
        } else {
          updated_rows++;
          if (set.smmhype_service_id) { smmhype_filled++; perCategory[cat].hype++; }
          if (set.smmpanel_service_id) { smmpanel_filled++; perCategory[cat].panel++; }
          if (set.verified_service_id) { verified_filled++; perCategory[cat].verified++; }
        }
      }
    }
  }

  console.log("[pricing-cache] v136 multi-category sync", {
    smmhype_catalog: hypeList?.length ?? 0,
    smmpanel_catalog: panelList?.length ?? 0,
    verified_catalog: verifiedList?.length ?? 0,
    categories: Object.keys(perCategory).length,
    per_category: perCategory,
    scanned: ((rows as any[]) ?? []).length,
    updated_rows,
    smmhype_filled, smmpanel_filled, verified_filled,
  });

  lastReserveSyncAt = Date.now();
  purgePricingCacheMemory("syncReserveProviderIds:end");

  return {
    smmhype_filled,
    smmpanel_filled,
    verified_filled,
    smmhype_catalog: hypeList?.length ?? 0,
    smmpanel_catalog: panelList?.length ?? 0,
    verified_catalog: verifiedList?.length ?? 0,
    scanned: ((rows as any[]) ?? []).length,
    updated_rows,
  };
}
