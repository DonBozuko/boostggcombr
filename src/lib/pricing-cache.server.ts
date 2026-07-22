// v137 — Strict Canonical Link Matrix.
// A busca heurística por aproximação de nomes foi EXTERMINADA (evita IDs replicados
// tipo 7593 colado em lote). Agora os IDs em pricing_items são a fonte da verdade:
// - Sem preenchimento automático por nome.
// - Sincronismo contínuo lê os catálogos remotos indexados por service_id e atualiza
//   apenas cost_brl (rate vivo) recalculando price_brl com a Equação Fabiano.
// Preserva HUD v57, largura +80px v101, grade 200 v107, cronômetro 3min v105,
// Mystery Box v115, Margin Guardian v135, Rate Limit v129, Telegram v125.

import { computeGuardedPrice } from "./margin-guardian";

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
// v137 — Canonical Link Sync (rate + saldo, sem heurística)
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
          "User-Agent": "EliteBoostPrime-CanonicalSync/137",
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

function indexById(list: RemoteService[] | null): Map<string, RemoteService> {
  const m = new Map<string, RemoteService>();
  if (!list) return m;
  for (const s of list) {
    const id = cleanId(s.service);
    if (id) m.set(id, s);
  }
  return m;
}

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
    console.warn("[pricing-cache] v137 canonical sync lazy falhou", e);
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

  // v137 — handshake vivo paralelo nas 3 APIs.
  const [hypeList, panelList, verifiedList] = await Promise.all([
    process.env.SMMHYPE_API_KEY
      ? fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.smmhype, process.env.SMMHYPE_API_KEY)
      : Promise.resolve(null),
    process.env.SMMPAINEL_API_KEY
      ? fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.smmpanel, process.env.SMMPAINEL_API_KEY)
      : Promise.resolve(null),
    process.env.VERIFIED_API_KEY
      ? fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.verified, process.env.VERIFIED_API_KEY)
      : Promise.resolve(null),
  ]);

  // v213 — Alerta se NENHUM fornecedor respondeu com catálogo.
  // Antes: sync retornava "0 updates" silencioso (parecia sucesso). Agora dispara Telegram.
  const catalogsAlive = [hypeList, panelList, verifiedList].filter((l) => Array.isArray(l) && l.length > 0).length;
  if (catalogsAlive === 0) {
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      await dispatchWhatsappAlert(
        `🚨 SINCRONIZAÇÃO DE PREÇOS FALHOU\n\nPROBLEMA: nenhum dos 3 fornecedores (SMMHype, SMMPainel, Verified) devolveu catálogo. Preços do site podem ficar desatualizados.\n\nO QUE FAZER: verificar se as APIs dos fornecedores estão fora do ar ou se alguma chave expirou. Enquanto isso, os preços antigos continuam valendo.`,
      ).catch(() => {});
    } catch { /* noop */ }
  }

  const hypeIdx = indexById(hypeList);
  const panelIdx = indexById(panelList);
  const verifiedIdx = indexById(verifiedList);

  const { data: rows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id");

  let smmhype_filled = 0;
  let smmpanel_filled = 0;
  let verified_filled = 0;
  let updated_rows = 0;

  for (const r of ((rows as any[]) ?? [])) {
    const qty = Number(r.quantidade);
    const hypeId = cleanId(r.smmhype_service_id);
    const panelId = cleanId(r.smmpanel_service_id);
    const verifiedId = cleanId(r.verified_service_id);

    // Confere presença viva de cada ID canônico no catálogo remoto correspondente.
    const hypeHit = hypeId ? hypeIdx.get(hypeId) : null;
    const panelHit = panelId ? panelIdx.get(panelId) : null;
    const verifiedHit = verifiedId ? verifiedIdx.get(verifiedId) : null;

    if (hypeHit) smmhype_filled++;
    if (panelHit) smmpanel_filled++;
    if (verifiedHit) verified_filled++;

    // Custo canônico = menor rate vivo entre os provedores vinculados (por 1000 → * qty / 1000).
    const rates: number[] = [];
    for (const hit of [hypeHit, panelHit, verifiedHit]) {
      if (!hit) continue;
      const rate = Number(hit.rate);
      if (Number.isFinite(rate) && rate > 0) rates.push(rate);
    }
    if (rates.length === 0) continue;

    const bestRatePer1k = Math.min(...rates);
    const newCost = Number(((bestRatePer1k * qty) / 1000).toFixed(4));
    const newPrice = computeGuardedPrice(newCost, qty); // Equação Fabiano Tiered v173

    const currentCost = Number(r.cost_brl ?? 0);
    const currentPrice = Number(r.price_brl ?? 0);
    const costChanged = Math.abs(newCost - currentCost) > 0.0001;
    const priceChanged = Math.abs(newPrice - currentPrice) > 0.009;

    if (!costChanged && !priceChanged) continue;

    const patch: Record<string, unknown> = {
      cost_brl: newCost,
      price_brl: newPrice,
      synced_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .update(patch)
      .eq("pacote", r.pacote);
    if (error) {
      console.error("[pricing-cache] v137 UPDATE rate/price falhou", { pacote: r.pacote, error: error.message });
    } else {
      updated_rows++;
    }
  }

  console.log("[pricing-cache] v137 canonical link sync", {
    smmhype_catalog: hypeList?.length ?? 0,
    smmpanel_catalog: panelList?.length ?? 0,
    verified_catalog: verifiedList?.length ?? 0,
    scanned: ((rows as any[]) ?? []).length,
    updated_rows,
    smmhype_bound: smmhype_filled,
    smmpanel_bound: smmpanel_filled,
    verified_bound: verified_filled,
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
