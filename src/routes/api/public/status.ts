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
          const providers = knownProviders.map((slug) => {
            const h = health.find((x) => x.slug === slug);
            const unstable = h?.unstable_until && new Date(h.unstable_until).getTime() > now;
            const w = wallets.find((x) => (x.fornecedor_slug ?? "").toLowerCase() === slug);
            const saldo = w ? Number(w.saldo_brl ?? 0) : null;
            const status = unstable ? "instavel" : saldo != null && saldo < 5 ? "saldo_baixo" : "operacional";
            return {
              slug,
              label: slug === "smmhype" ? "SMMHype" : slug === "smmpanel" ? "SMMPanel" : "Verified",
              status,
              saldo_brl: saldo,
              unstable_until: unstable ? h?.unstable_until : null,
            };
          });

          const sellable = items.filter((x) => x.is_sellable !== false).length;
          const total = items.length;
          const anyDown = providers.some((p) => p.status === "instavel");
          const allDown = providers.every((p) => p.status === "instavel");

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
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: e?.message ?? "unknown", overall: "desconhecido" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
