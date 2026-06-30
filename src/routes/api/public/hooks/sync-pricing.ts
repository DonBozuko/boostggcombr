import { createFileRoute } from "@tanstack/react-router";

// Cron-Driven API Replication Layer — endpoint público chamado via pg_cron.
// Atualiza pricing_cache (custo por 1000 em BRL) de todas as categorias.
export const Route = createFileRoute("/api/public/hooks/sync-pricing")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { syncPricingCacheAll } = await import("@/lib/pricing-engine.server");
          const result = await syncPricingCacheAll();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(err?.message ?? err) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => {
        try {
          const { syncPricingCacheAll } = await import("@/lib/pricing-engine.server");
          const result = await syncPricingCacheAll();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(err?.message ?? err) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
