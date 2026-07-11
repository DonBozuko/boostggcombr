import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SMMHYPE_URL = "https://smmhype.com/api/v2";

type ProviderService = {
  service: number | string;
  name: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean;
};

export const SERVICOS_MONITORADOS = [14325, 14225, 18860];

// Fallback fixo: IDs estáveis garantidos no cache mesmo se a API do fornecedor
// não os retornar (evita falsos positivos de "serviço sumiu").
export const FALLBACK_SERVICES: Array<{
  provider_service_id: number;
  category: string;
  name: string;
  rate: number;
  min: number;
  max: number;
}> = [
  { provider_service_id: 14325, category: "Instagram Followers", name: "Instagram Followers (Refill) — 14325", rate: 0, min: 10, max: 1000000 },
  { provider_service_id: 14225, category: "Instagram Followers", name: "Instagram Followers (Refill) — 14225", rate: 0, min: 10, max: 1000000 },
  { provider_service_id: 18860, category: "Instagram Likes",     name: "Instagram Likes (Refill) — 18860",     rate: 0, min: 10, max: 1000000 },
];

async function ensureFallback() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = FALLBACK_SERVICES.map((s) => ({
    ...s,
    refill: true,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin
    .from("services_cache")
    .upsert(rows, { onConflict: "provider_service_id", ignoreDuplicates: false });
  if (error) throw error;
}

export async function syncSmmhypeServices() {
  const apiKey = process.env.SMMHYPE_API_KEY;
  if (!apiKey) throw new Error("SMMHYPE_API_KEY ausente");

  const body = new URLSearchParams({ key: apiKey, action: "services" });
  const resp = await fetch(SMMHYPE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`SMMhype HTTP ${resp.status}`);
  const json = (await resp.json()) as ProviderService[];
  if (!Array.isArray(json)) throw new Error("Resposta inesperada do fornecedor");

  // v158 — filtro amplo: importa TODO o catálogo (IG/TK/YT/FB/TG, com e sem refill).
  // O match fino é feito no backfill por palavra-chave + faixa min/max.
  const filtered = json.filter(
    (s) => typeof s.category === "string" && typeof s.name === "string" && s.service != null,
  );


  const rows = filtered.map((s) => ({
    provider_service_id: Number(s.service),
    category: String(s.category),
    name: String(s.name),
    rate: Number(s.rate) || 0,
    refill: s.refill === true,
    min: Number(s.min) || 0,
    max: Number(s.max) || 0,
    updated_at: new Date().toISOString(),
  }));


  // Upsert
  if (rows.length > 0) {
    const { error } = await supabaseAdmin
      .from("services_cache")
      .upsert(rows, { onConflict: "provider_service_id" });
    if (error) throw error;
  }

  // Apaga os que sumiram — mas NUNCA remove IDs monitorados/fallback
  const ids = rows.map((r) => r.provider_service_id);
  const { data: existentes } = await supabaseAdmin
    .from("services_cache")
    .select("provider_service_id");
  const aRemover = (existentes ?? [])
    .map((r: any) => r.provider_service_id as number)
    .filter((id: number) => !ids.includes(id) && !SERVICOS_MONITORADOS.includes(id));
  if (aRemover.length > 0) {
    await supabaseAdmin
      .from("services_cache")
      .delete()
      .in("provider_service_id", aRemover);
  }

  // Garante presença dos IDs estáveis (fallback) mesmo se o fornecedor não os retornar
  await ensureFallback();

  // Auto-popula service_id_matrix com variantes BR e mundial detectadas via regex no nome.
  const brStats = await autoPopulateServiceMatrix(rows).catch((e) => ({ error: String(e?.message ?? e) }));

  const monitoradosFaltando: number[] = []; // garantidos via fallback

  return {
    ok: true as const,
    total: rows.length,
    synced_at: new Date().toISOString(),
    removed: aRemover.length,
    missing_monitored: monitoradosFaltando,
    matrix: brStats,
  };
}

// ============================================================================
// Auto-populador de service_id_matrix — detecta BR/mundial + tipo + faixa de qty
// direto do catálogo sincronizado. Sem intervenção manual.
// ============================================================================
type CatalogRow = { provider_service_id: number; category: string; name: string; min: number; max: number; rate: number };

function classifyService(row: CatalogRow): { network: string; service_type: string } | null {
  const hay = `${row.category} ${row.name}`.toLowerCase();
  // Exclusões duras: ADS, comentários, saves, story, thread/channel-member confundido com follower
  if (/\bads\b|adsense|comment|coment|\bsave|story views|shares?\b/.test(hay)) return null;

  // BR: bandeira, "brazil", "brasil", "português", "[br]"; exige token isolado (não pega "bright", "brand")
  const isBr = /🇧🇷|brazil|brasil|portugues|português|\[br\]|\bbr\s|\-\s?br\b/i.test(hay);
  const suffix = isBr ? "_br" : "";

  let network: string | null = null;
  if (/\binstagram\b|\big\b/.test(hay)) network = "instagram";
  else if (/\btiktok\b|\btt\b/.test(hay)) network = "tiktok";
  else if (/\byoutube\b|\byt\b/.test(hay)) network = "youtube";
  else if (/\bfacebook\b|\bfb\b/.test(hay)) network = "facebook";
  else if (/telegram/.test(hay)) network = "telegram";
  if (!network) return null;

  let type: string | null = null;
  // Followers: exige "follower/seguidor/subscribe/inscrito"; para IG/TT/FB EXCLUI "channel", "thread", "group", "member"
  const isChannelish = /channel|thread|group|grupo|\bmember\b|membro/.test(hay);
  if (/follower|seguidor|subscribe|inscrito/.test(hay) && !(isChannelish && network !== "telegram")) {
    type = "followers";
  } else if (/\blike|curtida/.test(hay)) type = "likes";
  else if (/view|visualiza/.test(hay)) type = "views";
  else if (network === "telegram" && /canal|channel/.test(hay)) type = "canal";
  else if (network === "telegram" && (/grupo|group/.test(hay) || /\bmember\b/.test(hay))) type = "grupo";
  if (!type) return null;

  return { network, service_type: type + suffix };
}

// Faixas padrão de tier. Grande limitado a 100k (BR real raramente cobre 1M).
const TIERS: Array<{ label: string; min: number; max: number }> = [
  { label: "pequeno", min: 100, max: 2000 },
  { label: "medio", min: 2001, max: 20000 },
  { label: "grande", min: 20001, max: 100000 },
];

async function autoPopulateServiceMatrix(rows: CatalogRow[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Agrupa serviços classificáveis por (network, service_type), ordena por rate asc (mais barato ganha).
  const buckets = new Map<string, CatalogRow[]>();
  for (const r of rows) {
    const c = classifyService(r);
    if (!c) continue;
    if (!Number.isFinite(r.min) || !Number.isFinite(r.max) || r.max <= 0) continue;
    const key = `${c.network}|${c.service_type}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }

  const toUpsert: Array<{ network: string; service_type: string; min_qty: number; max_qty: number; service_id: number; tier_label: string; notes: string }> = [];
  for (const [key, list] of buckets) {
    const [network, service_type] = key.split("|");
    list.sort((a, b) => (a.rate || 999) - (b.rate || 999));
    for (const tier of TIERS) {
      // pega o serviço mais barato que cobre a faixa inteira do tier
      const match = list.find((s) => s.min <= tier.min && s.max >= tier.max);
      if (!match) continue;
      toUpsert.push({
        network,
        service_type,
        min_qty: tier.min,
        max_qty: tier.max,
        service_id: match.provider_service_id,
        tier_label: tier.label,
        notes: `auto:${match.provider_service_id}·${(match.name || "").slice(0, 60)}`,
      });
    }
  }

  if (toUpsert.length === 0) return { populated: 0, buckets: buckets.size };

  const { error } = await supabaseAdmin
    .from("service_id_matrix" as any)
    .upsert(toUpsert as any, { onConflict: "network,service_type,min_qty,max_qty" });
  if (error) console.warn("[autoPopulateServiceMatrix] upsert falhou:", error.message);
  return { populated: toUpsert.length, buckets: buckets.size, error: error?.message };
}

// Executa fallback imediatamente em runtime (popula cache em cold start se vazio)
ensureFallback().catch(() => { /* silencioso: chamado novamente no próximo sync */ });

// v164 — Alias explícito para paridade tri-provider (SMMhype = services_cache)
export const syncSmmHype = syncSmmhypeServices;

// ============================================================================
// v164 — Sync isolado SMMPainel → smmpanel_services_cache
// ============================================================================
async function syncGenericProvider(opts: {
  slug: "smmpanel" | "verified";
  endpoint: string;
  apiKey: string | undefined;
  tableName: "smmpanel_services_cache" | "verified_services_cache";
}) {
  if (!opts.apiKey) throw new Error(`${opts.slug.toUpperCase()}_API_KEY ausente`);
  const body = new URLSearchParams({ key: opts.apiKey, action: "services" });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  let json: ProviderService[];
  try {
    const resp = await fetch(opts.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": "EliteBoostPrime-Sync/164",
      },
      body: body.toString(),
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`${opts.slug} HTTP ${resp.status}`);
    json = JSON.parse(await resp.text()) as ProviderService[];
  } finally { clearTimeout(timer); }
  if (!Array.isArray(json)) throw new Error(`Resposta inesperada de ${opts.slug}`);

  const filtered = json.filter(
    (s) => typeof s.category === "string" && typeof s.name === "string" && s.service != null,
  );
  const rows = filtered.map((s) => ({
    provider_service_id: Number(s.service),
    category: String(s.category),
    name: String(s.name),
    rate: Number(s.rate) || 0,
    refill: s.refill === true,
    min: Number(s.min) || 0,
    max: Number(s.max) || 0,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    // batches de 500 p/ evitar payloads gigantes
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabaseAdmin
        .from(opts.tableName as any)
        .upsert(chunk as any, { onConflict: "provider_service_id" });
      if (error) throw error;
    }
  }
  return {
    ok: true as const,
    provider: opts.slug,
    total: rows.length,
    synced_at: new Date().toISOString(),
  };
}

export async function syncSmmPanel() {
  return syncGenericProvider({
    slug: "smmpanel",
    endpoint: "https://smmpainel.com/api/v2",
    apiKey: process.env.SMMPAINEL_API_KEY,
    tableName: "smmpanel_services_cache",
  });
}

export async function syncVerified() {
  return syncGenericProvider({
    slug: "verified",
    endpoint: "https://verifiedatacado.com/api/v2",
    apiKey: process.env.VERIFIED_API_KEY,
    tableName: "verified_services_cache",
  });
}
