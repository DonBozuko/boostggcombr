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

// IDs de referência para monitoramento (apenas leitura/diagnóstico).
// v296 — NÃO protegem mais o cache da limpeza: o catálogo em cache tem que ser
// 100% igual ao que o fornecedor devolve. IDs "garantidos na marra" faziam o
// sistema acreditar que um serviço existia quando o fornecedor já o tinha
// removido — foi a causa raiz do reembolso de R$283 (p15k → serviço 14225).
export const SERVICOS_MONITORADOS = [14325, 14225, 18860, 4100, 14441, 9264, 4292];


export async function syncSmmhypeServices() {
  const apiKey = process.env.SMMHYPE_API_KEY;
  if (!apiKey) throw new Error("SMMHYPE_API_KEY ausente");

  const body = new URLSearchParams({ key: apiKey, action: "services" });
  const resp = await fetch(SMMHYPE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(20_000),
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

  // v296 — Apaga TODOS os que sumiram do fornecedor, sem exceção.
  const ids = rows.map((r) => r.provider_service_id);
  // v308 — paginado: sem isso só as 1.000 primeiras linhas eram comparadas e
  // serviço morto continuava no cache virando ID fantasma.
  const existentes: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page } = await supabaseAdmin
      .from("services_cache")
      .select("provider_service_id")
      .range(from, from + 999);
    existentes.push(...((page as any[]) ?? []));
    if (((page as any[]) ?? []).length < 1000) break;
  }
  const idSet = new Set(ids);
  const aRemover = (existentes ?? [])
    .map((r: any) => r.provider_service_id as number)
    .filter((id: number) => !idSet.has(id));
  if (aRemover.length > 0) {
    await supabaseAdmin
      .from("services_cache")
      .delete()
      .in("provider_service_id", aRemover);
  }

  // Diagnóstico honesto: quais IDs de referência o fornecedor não lista mais.
  const monitoradosFaltando = SERVICOS_MONITORADOS.filter((id) => !ids.includes(id));

  return {
    ok: true as const,
    total: rows.length,
    synced_at: new Date().toISOString(),
    removed: aRemover.length,
    missing_monitored: monitoradosFaltando,
  };
}

// v172 — auto-populador removido: gerava IDs falsos (Channel Member como follower_br etc).
// service_id_matrix é 100% curadoria manual via migration (SEEDs) + smoke-test antes de publicar SKU.


// v164 — Alias explícito para paridade tri-provider (SMMhype = services_cache)
export const syncSmmHype = syncSmmhypeServices;

// ============================================================================
// v164 / v245 — Sync genérico para qualquer fornecedor (endpoint API padrão SMM)
// ============================================================================
type ProviderSlug = string;

const KNOWN_TABLES: Record<ProviderSlug, string> = {
  smmhype: "smmhype_services_cache",
  smmpanel: "smmpanel_services_cache",
  smmpainel: "smmpanel_services_cache",
  verified: "verified_services_cache",
  provider4: "provider4_services_cache",
};

async function syncGenericProvider(opts: {
  slug: ProviderSlug;
  endpoint: string;
  apiKey: string | undefined;
  tableName: string;
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
        "User-Agent": "EliteBoostPrime-Sync/245",
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

export async function syncProviderBySlug(slug: ProviderSlug) {
  const normalized = slug.toLowerCase();
  const tableName = KNOWN_TABLES[normalized];
  if (!tableName) throw new Error(`Fornecedor ${slug} não tem tabela de cache mapeada`);

  // v245 — para fornecedores já conhecidos, mantém comportamento anterior
  // (evita ler do banco e quebrar algo que está funcionando).
  if (normalized === "smmhype") return syncSmmhypeServices();
  if (normalized === "smmpanel" || normalized === "smmpainel") {
    return syncGenericProvider({
      slug: "smmpanel",
      endpoint: "https://smmpainel.com/api/v2",
      apiKey: process.env.SMMPAINEL_API_KEY,
      tableName: "smmpanel_services_cache",
    });
  }
  if (normalized === "verified") {
    return syncGenericProvider({
      slug: "verified",
      endpoint: "https://verifiedatacado.com/api/v2",
      apiKey: process.env.VERIFIED_API_KEY,
      tableName: "verified_services_cache",
    });
  }

  // v245 — provider4 (ou futuro): lê endpoint/chave da tabela fornecedores
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("fornecedores")
    .select("api_url, api_key_secret")
    .eq("slug", normalized)
    .maybeSingle();
  if (!data) throw new Error(`Fornecedor ${slug} não cadastrado na tabela fornecedores`);
  const apiKey = process.env[(data as any).api_key_secret];
  if (!apiKey) throw new Error(`Secret ${(data as any).api_key_secret} não configurado`);
  return syncGenericProvider({
    slug: normalized,
    endpoint: (data as any).api_url,
    apiKey,
    tableName,
  });
}

export async function syncSmmPanel() {
  return syncProviderBySlug("smmpanel");
}

export async function syncVerified() {
  return syncProviderBySlug("verified");
}

export async function syncProvider4() {
  return syncProviderBySlug("provider4");
}
