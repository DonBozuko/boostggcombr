import { createFileRoute } from "@tanstack/react-router";

/**
 * Bestseller Scanner — roda a cada 30min via pg_cron.
 * Calcula o pacote mais vendido nas últimas 24h por categoria (prefixo do ID)
 * e grava em admin_settings.bestsellers_24h para social proof dinâmico.
 * Zero risco: não altera preço, ordem, ou checkout — só marca badge.
 */
export const Route = createFileRoute("/api/public/hooks/bestseller-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if ((!process.env.ADMIN_TOKEN && !process.env.CRON_ADMIN_TOKEN) || (token !== process.env.ADMIN_TOKEN && token !== process.env.CRON_ADMIN_TOKEN)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: rows, error } = await supabaseAdmin
            .from("pedidos")
            .select("pacote")
            .eq("status", "paid")
            .gte("created_at", since)
            .not("pacote", "is", null);

          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          // Agrupa por (prefixo, pacote) — prefixo = letras iniciais do id
          const prefixOf = (id: string) => {
            const m = id.match(/^([a-z]+)/i);
            return m ? m[1].toLowerCase() : id;
          };
          const counts = new Map<string, number>(); // key = pacote
          const byPrefix = new Map<string, { pacote: string; count: number }>();

          for (const r of rows ?? []) {
            const pacote = String((r as { pacote?: string }).pacote || "").trim();
            if (!pacote) continue;
            const c = (counts.get(pacote) ?? 0) + 1;
            counts.set(pacote, c);
            const pref = prefixOf(pacote);
            const cur = byPrefix.get(pref);
            if (!cur || c > cur.count) byPrefix.set(pref, { pacote, count: c });
          }

          // Grava mapa { pacote: true } — vitrine só precisa saber se é bestseller
          const bestsellers: Record<string, true> = {};
          for (const { pacote } of byPrefix.values()) bestsellers[pacote] = true;

          const { error: upErr } = await supabaseAdmin
            .from("admin_settings")
            .upsert(
              { key: "bestsellers_24h", value: { bestsellers, generated_at: new Date().toISOString(), sample: rows?.length ?? 0 } },
              { onConflict: "key" },
            );

          if (upErr) {
            return new Response(JSON.stringify({ ok: false, error: upErr.message }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(
            JSON.stringify({ ok: true, categories: byPrefix.size, sample: rows?.length ?? 0, bestsellers }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
