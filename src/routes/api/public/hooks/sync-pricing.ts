import { createFileRoute } from "@tanstack/react-router";

// Cron-Driven API Replication Layer — endpoint público chamado via pg_cron.
// Atualiza pricing_cache (custo por 1000 em BRL) de todas as categorias.
export const Route = createFileRoute("/api/public/hooks/sync-pricing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if ((!process.env.ADMIN_TOKEN && !process.env.CRON_ADMIN_TOKEN) || (token !== process.env.ADMIN_TOKEN && token !== process.env.CRON_ADMIN_TOKEN)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { syncPricingCacheAll } = await import("@/lib/pricing-engine.server");
          const { syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
          const url = new URL(request.url);
          const forceContingency = url.searchParams.get("force") === "contingency";
          // v272 — SEQUENCIAL, nunca em paralelo: o motor de fallback e o
          // handshake canônico gravavam o mesmo pacote ao mesmo tempo e o
          // preço da vitrine ficava oscilando (custo estimado x custo real).
          const result = await syncPricingCacheAll({ forceContingency });
          const reserves = await syncReserveProviderIds().catch((e) => ({ error: String(e?.message ?? e) }));
          // v304 — escada monotônica é a última palavra do ciclo.
          const { enforcePriceAuthority } = await import("@/lib/price-authority.server");
          const escada = await enforcePriceAuthority("hook-post").catch((e) => ({ error: String(e?.message ?? e) }));

          (result as any).reserves = reserves;
          (result as any).escada = escada;
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
        if ((!process.env.ADMIN_TOKEN && !process.env.CRON_ADMIN_TOKEN) || (token !== process.env.ADMIN_TOKEN && token !== process.env.CRON_ADMIN_TOKEN)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { syncPricingCacheAll } = await import("@/lib/pricing-engine.server");
          const { syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
          const url = new URL(request.url);
          const forceContingency = url.searchParams.get("force") === "contingency";
          // v304 — SEQUENCIAL (o GET ainda rodava em paralelo, contrariando a
          // v272: os dois motores gravavam o mesmo pacote ao mesmo tempo).
          const result = await syncPricingCacheAll({ forceContingency });
          const reserves = await syncReserveProviderIds().catch((e) => ({ error: String(e?.message ?? e) }));
          const { enforcePriceAuthority } = await import("@/lib/price-authority.server");
          const escada = await enforcePriceAuthority("hook-get").catch((e) => ({ error: String(e?.message ?? e) }));
          (result as any).reserves = reserves;
          (result as any).escada = escada;
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
