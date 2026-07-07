import { createFileRoute } from "@tanstack/react-router";

// Cron-Driven API Replication Layer — endpoint público chamado via pg_cron.
// Atualiza pricing_cache (custo por 1000 em BRL) de todas as categorias.
export const Route = createFileRoute("/api/public/hooks/sync-pricing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { syncPricingCacheAll } = await import("@/lib/pricing-engine.server");
          const { syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
          const url = new URL(request.url);
          const forceContingency = url.searchParams.get("force") === "contingency";
          const [result, reserves] = await Promise.all([
            syncPricingCacheAll({ forceContingency }),
            syncReserveProviderIds().catch((e) => ({ error: String(e?.message ?? e) })),
          ]);
          (result as any).reserves = reserves;
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
              "Pragma": "no-cache",
              "Expires": "0",
            },
          });
        } catch (err: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(err?.message ?? err) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { syncPricingCacheAll } = await import("@/lib/pricing-engine.server");
          const { syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
          const url = new URL(request.url);
          const forceContingency = url.searchParams.get("force") === "contingency";
          const [result, reserves] = await Promise.all([
            syncPricingCacheAll({ forceContingency }),
            syncReserveProviderIds().catch((e) => ({ error: String(e?.message ?? e) })),
          ]);
          (result as any).reserves = reserves;
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
              "Pragma": "no-cache",
              "Expires": "0",
            },
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
