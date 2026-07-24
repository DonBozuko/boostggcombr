// v215 — Endpoint público de saúde: fornecedores + carteira + últimos incidentes
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const now = Date.now();

          const [healthRes, walletRes, catalogRes] = await Promise.all([
            supabaseAdmin.from("provider_health" as any).select("slug, unstable_until, last_failure_at, last_error, failure_count"),
            supabaseAdmin.from("virtual_wallets" as any).select("wallet_key, label, fornecedor_slug, saldo_brl").not("wallet_key", "like", "prov_%"),
            supabaseAdmin.from("pricing_items" as any).select("is_sellable"),
          ]);

          const health = (healthRes.data as any[]) ?? [];
          const wallets = (walletRes.data as any[]) ?? [];
          const items = (catalogRes.data as any[]) ?? [];

          const knownProviders = ["smmhype", "smmpanel", "verified"];
          // v234 — Status público não expõe saldo, nome de fornecedor nem erro interno.
          const internal = knownProviders.map((slug, i) => {
            const h = health.find((x) => x.slug === slug);
            const unstable = h?.unstable_until && new Date(h.unstable_until).getTime() > now;
            const w = wallets.find((x) => (x.fornecedor_slug ?? "").toLowerCase() === slug);
            const saldo = w ? Number(w.saldo_brl ?? 0) : null;
            const status = unstable || (saldo != null && saldo < 5) ? "instavel" : "operacional";
            return { label: `Rota de entrega ${i + 1}`, status };
          });
          const providers = internal.map((p) => ({ label: p.label, status: p.status }));

          const sellable = items.filter((x) => x.is_sellable !== false).length;
          const total = items.length;
          const anyDown = internal.some((p) => p.status === "instavel");
          const allDown = internal.every((p) => p.status === "instavel");

          const overall = allDown ? "critico" : anyDown ? "parcial" : sellable < total * 0.9 ? "atencao" : "operacional";

          return new Response(
            JSON.stringify({
              ok: true,
              overall,
              providers,
              catalog: { total, sellable, pausados: total - sellable },
              ts: new Date().toISOString(),
            }),
            { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" } },
          );
        } catch {
          return new Response(
            JSON.stringify({ ok: false, overall: "desconhecido" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

      },
    },
  },
});
