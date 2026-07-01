// v130 — Cache in-memory + Auto-Mapper de IDs em provedores reserva (SMMPanel/Verified).
// Preserva HUD v57, cronômetro v105, MysteryBox v115, rolagem v122, rate-limit v129, Telegram v125.

type PricingRow = {
  pacote: string;
  quantidade: number;
  valor: number;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
};

const TTL_MS = 1000;
let cache: { at: number; byPacote: Map<string, PricingRow> } | null = null;
let inflight: Promise<Map<string, PricingRow>> | null = null;

async function refresh(): Promise<Map<string, PricingRow>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, quantidade, valor, smmhype_service_id, smmpanel_service_id, verified_service_id");
  const map = new Map<string, PricingRow>();
  for (const r of ((data as any[]) ?? [])) map.set(String(r.pacote), r as PricingRow);
  cache = { at: Date.now(), byPacote: map };
  return map;
}

export async function getPricingRow(pacote: string): Promise<PricingRow | null> {
  const fresh = cache && Date.now() - cache.at < TTL_MS;
  if (fresh) return cache!.byPacote.get(pacote) ?? null;
  if (!inflight) inflight = refresh().finally(() => { inflight = null; });
  const map = await inflight;
  return map.get(pacote) ?? null;
}

export async function primePricingCache(): Promise<void> {
  if (!cache || Date.now() - cache.at >= TTL_MS) {
    if (!inflight) inflight = refresh().finally(() => { inflight = null; });
    await inflight;
  }
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

async function fetchServiceCatalog(endpoint: string, apiKey: string): Promise<RemoteService[] | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
  "facebook:curtidas":       { must: [["facebook","fb"], ["like","curtida"]], not: ["follower","view","page"] },
  "telegram:canal":          { must: [["telegram"], ["channel","canal","member","membro"]], not: ["group","grupo","view","react"] },
  "telegram:grupo":          { must: [["telegram"], ["group","grupo","member","membro"]], not: ["channel","canal","view","react"] },
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
  smmpanel_filled: number;
  verified_filled: number;
  smmpanel_catalog: number;
  verified_catalog: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [panelList, verifiedList] = await Promise.all([
    process.env.SMMPAINEL_API_KEY
      ? fetchServiceCatalog("https://smmpainel.net/api/v2", process.env.SMMPAINEL_API_KEY)
      : Promise.resolve(null),
    process.env.VERIFIED_API_KEY
      ? fetchServiceCatalog("https://verifiedatacado.com/api/v2", process.env.VERIFIED_API_KEY)
      : Promise.resolve(null),
  ]);

  const { data: rows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, smmpanel_service_id, verified_service_id");

  let smmpanel_filled = 0;
  let verified_filled = 0;
  const updates: Array<{ pacote: string; smmpanel_service_id?: string; verified_service_id?: string }> = [];

  for (const r of ((rows as any[]) ?? [])) {
    const cat = String(r.category ?? "");
    const qty = Number(r.quantidade);
    const patch: { pacote: string; smmpanel_service_id?: string; verified_service_id?: string } = { pacote: r.pacote };
    let dirty = false;

    if (panelList && !r.smmpanel_service_id) {
      const m = pickBestMatch(panelList, cat, qty);
      if (m) { patch.smmpanel_service_id = String(m.service); smmpanel_filled++; dirty = true; }
    }
    if (verifiedList && !r.verified_service_id) {
      const m = pickBestMatch(verifiedList, cat, qty);
      if (m) { patch.verified_service_id = String(m.service); verified_filled++; dirty = true; }
    }
    if (dirty) updates.push(patch);
  }

  // Atualização item-a-item (evita sobrescrever campos ausentes no upsert).
  for (const u of updates) {
    const set: Record<string, string> = {};
    if (u.smmpanel_service_id) set.smmpanel_service_id = u.smmpanel_service_id;
    if (u.verified_service_id) set.verified_service_id = u.verified_service_id;
    if (Object.keys(set).length) {
      await supabaseAdmin.from("pricing_items" as any).update(set).eq("pacote", u.pacote);
    }
  }

  console.log("[pricing-cache] v130 auto-map", {
    smmpanel_catalog: panelList?.length ?? 0,
    verified_catalog: verifiedList?.length ?? 0,
    smmpanel_filled, verified_filled,
  });

  // Invalida cache local para o próximo getPricingRow refletir os IDs recém-mapeados.
  cache = null;

  return {
    smmpanel_filled,
    verified_filled,
    smmpanel_catalog: panelList?.length ?? 0,
    verified_catalog: verifiedList?.length ?? 0,
  };
}
