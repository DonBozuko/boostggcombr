// v214 — GET lê estado do teste seco para o painel admin.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/admin/catalog-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (
          !token ||
          (token !== process.env.ADMIN_TOKEN &&
            token !== process.env.CRON_ADMIN_TOKEN)
        ) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("pricing_items" as any)
            .select("pacote, category, quantidade, cost_brl, price_brl, is_sellable, sellable_reason, last_dry_run, smmhype_service_id, smmpanel_service_id, verified_service_id")
            .order("category", { ascending: true })
            .order("quantidade", { ascending: true });
          const rows = (data as any[]) ?? [];
          const total = rows.length;
          const sellable = rows.filter((r) => r.is_sellable).length;
          const paused = total - sellable;
          return new Response(JSON.stringify({ ok: true, total, sellable, paused, rows }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
