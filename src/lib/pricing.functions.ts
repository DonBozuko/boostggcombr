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
