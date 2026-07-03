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

  const monitoradosFaltando: number[] = []; // garantidos via fallback

  return {
    ok: true as const,
    total: rows.length,
    synced_at: new Date().toISOString(),
    removed: aRemover.length,
    missing_monitored: monitoradosFaltando,
  };
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
