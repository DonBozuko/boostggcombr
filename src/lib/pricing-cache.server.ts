// v93 — Fast in-memory cache p/ pricing_items (TTL ~1s).
// Reduz round-trip ao Supabase durante o dispatch pós-Pix aprovado.
// Preserva HUD v57 / v89 / cupom / avatares (leitura server-only).

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
