import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { Category } from "./pricing-engine.server";

export type PricingCategory = Category;

const VALID: PricingCategory[] = [
  "instagram:seguidores",
  "instagram:curtidas",
  "instagram:visualizacoes",
  "tiktok:seguidores",
  "tiktok:curtidas",
  "tiktok:visualizacoes",
  "youtube:inscritos",
  "youtube:visualizacoes",
  "facebook:seguidores",
  "facebook:curtidas",
  "telegram:canal",
  "telegram:grupo",
  "trafego:br",
  "trafego:global",
  "kwai:seguidores",
  "kwai:curtidas",
  "kwai:visualizacoes",
];

export const getPricingGrid = createServerFn({ method: "GET" })
  .inputValidator((data: { category: PricingCategory }) => {
    if (!data || !VALID.includes(data.category)) {
      throw new Error("category inválida");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { getPricingGridImpl } = await import("./pricing-engine.server");
    const result = await getPricingGridImpl(data.category);
    // v50 — Strict Edge CDN Cache Invalidation: vitrine sempre fresca,
    // sem race condition entre preço antigo e novo.
    try {
      setResponseHeader(
        "cache-control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      );
      setResponseHeader("pragma", "no-cache");
      setResponseHeader("expires", "0");
    } catch { /* sem request context: ignora */ }
    return result;
  });

// v202 — Grid BR curado (lê pricing_items direto, categoria 'x:y:br').
// Usado pelo toggle "🇧🇷 Só brasileiros" nos cards IG/TikTok.
export const getBrPricingGrid = createServerFn({ method: "GET" })
  .inputValidator((data: { network: "instagram" | "tiktok"; kind: "seguidores" }) => {
    if (!data || !["instagram", "tiktok"].includes(data.network)) throw new Error("network inválida");
    if (data.kind !== "seguidores") throw new Error("kind inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cat = `${data.network}:${data.kind}:br`;
    const { data: rows } = await supabaseAdmin
      .from("pricing_items")
      .select("pacote, quantidade, price_brl, is_sellable, last_dry_run")
      .eq("category", cat)
      .order("quantidade", { ascending: true });
    const all = (rows ?? []).map((r: any) => ({
      id: r.pacote as string,
      quantidade: Number(r.quantidade),
      valor: Number(r.price_brl),
      price: `R$ ${Number(r.price_brl).toFixed(2).replace(".", ",")}`,
      // v290 — pausa só vale com teste seco recente (48h).
      sellable: (() => {
        const dr = r.last_dry_run ? Date.parse(r.last_dry_run) : 0;
        const recente = dr > 0 && Date.now() - dr < 48 * 60 * 60 * 1000;
        return recente ? r.is_sellable !== false : true;
      })(),
    }));
    const disponiveis = all.filter((r) => r.sellable);
    const items = (disponiveis.length > 0 ? disponiveis : all)
      .map(({ sellable: _s, ...rest }) => rest)

      // v257 — Econômico (30 dias) primeiro, Premium (90 dias) depois.
      .sort((a, b) => {
        const pa = /^br-pro/i.test(a.id) ? 1 : 0;
        const pb = /^br-pro/i.test(b.id) ? 1 : 0;
        return pa - pb || a.quantidade - b.quantidade;
      });

    try {
      setResponseHeader("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
    } catch {}
    return { category: cat, source: "curado" as const, items, generated_at: new Date().toISOString() };
  });
