// v161 — Fila pública p/ robô externo consultar pedidos aguardando provisão.
// Autenticação: header `x-admin-token: <ADMIN_TOKEN>`.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/queue/waiting")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("pedidos")
          .select("id, pacote, quantidade, instagram_user, valor, custo_real, status, created_at")
          .in("status", ["waiting_provision", "MARGIN_HOLD", "SMM_FAILED"])
          .order("created_at", { ascending: true })
          .limit(200);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Enriquece com service_id do fornecedor sugerido; custo exposto prioriza o valor já reservado no pedido.
        const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
        const items = await Promise.all(
          (data ?? []).map(async (p: any) => {
            const ranked = await rankProvidersByCost({ pacote: p.pacote, quantidade: Number(p.quantidade) });
            const top = ranked[0] ?? null;
            return {
              pedido_id: p.id,
              status: p.status,
              pacote: p.pacote,
              quantidade: Number(p.quantidade),
              link_do_perfil: p.instagram_user,
              valor_cliente_brl: Number(p.valor),
              custo_estimado_brl: p.custo_real ?? top?.cost_brl ?? null,
              fornecedor_sugerido: top?.slug ?? null,
              service_id: top?.provider_service_id ?? null,
              created_at: p.created_at,
            };
          }),
        );

        return new Response(JSON.stringify({ ok: true, count: items.length, items }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
