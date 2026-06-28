import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export type PricingCategory =
  | "instagram:seguidores"
  | "instagram:curtidas"
  | "instagram:visualizacoes";

const VALID: PricingCategory[] = [
  "instagram:seguidores",
  "instagram:curtidas",
  "instagram:visualizacoes",
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
    try {
      setResponseHeader("cache-control", "public, max-age=600, s-maxage=600");
    } catch { /* sem request context: ignora */ }
    return result;
  });
