// v162 — Config dinâmica de precificação. Lê admin_settings.pricing_config
// (jsonb) com cache 30s. Fallback = valores atuais hardcoded.
let cache: { data: PricingConfig; at: number } | null = null;
const TTL_MS = 30_000;

export type PricingConfig = {
  profit_multiplier: number; // ex.: 4.0 = +300% de lucro sobre o custo
  coupon_buffer: number;     // ex.: 1.15 = gordura pra absorver PRIME15
  gateway_net: number;       // ex.: 0.9901 = líquido após taxa Pix 0,99%
  gateway_fixed: number;     // v168: taxa FIXA Pix MP em BRL (0,49)
  floor_brl: number;         // piso mínimo do pacote de entrada
};

const DEFAULT: PricingConfig = {
  profit_multiplier: 4.0,
  coupon_buffer: 1.15,
  gateway_net: 0.9901,
  gateway_fixed: 0.49,
  floor_brl: 5.0,
};

export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.data;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_settings" as any)
      .select("value")
      .eq("key", "pricing_config")
      .maybeSingle();
    const v = (data as any)?.value ?? {};
    const cfg: PricingConfig = {
      profit_multiplier: Number(v.profit_multiplier) > 0 ? Number(v.profit_multiplier) : DEFAULT.profit_multiplier,
      coupon_buffer:     Number(v.coupon_buffer)     > 0 ? Number(v.coupon_buffer)     : DEFAULT.coupon_buffer,
      gateway_net:       Number(v.gateway_net)       > 0 && Number(v.gateway_net) <= 1 ? Number(v.gateway_net) : DEFAULT.gateway_net,
      gateway_fixed:     Number(v.gateway_fixed)     >= 0 ? Number(v.gateway_fixed)    : DEFAULT.gateway_fixed,
      floor_brl:         Number(v.floor_brl)         > 0 ? Number(v.floor_brl)         : DEFAULT.floor_brl,
    };
    cache = { data: cfg, at: now };
    return cfg;
  } catch {
    cache = { data: DEFAULT, at: now };
    return DEFAULT;
  }
}

export function invalidatePricingConfigCache() { cache = null; }
