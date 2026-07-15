// Cron público /api/public/hooks/recovery-scan — chamado por pg_cron a cada 15min.
// Varre pedidos com Pix pendente entre 15min–24h e enfileira em pix_recovery_queue.
// Envia alerta Telegram pro admin se novos pedidos entram na fila.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/recovery-scan")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const now = Date.now();
          const from = new Date(now - 24 * 60 * 60 * 1000).toISOString();
          const to = new Date(now - 15 * 60 * 1000).toISOString();

          // Busca pedidos pendentes na janela
          const { data: pendentes, error } = await supabaseAdmin
            .from("pedidos")
            .select("id, mercado_pago_id, valor, rede_social, pacote, instagram_user, created_at, status")
            .in("status", ["pending", "mp_pending", "mp_in_process"])
            .gte("created_at", from)
            .lte("created_at", to)
            .limit(500);

          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

          const rows = pendentes ?? [];
          if (rows.length === 0) return Response.json({ ok: true, scanned: 0, enqueued: 0 });

          // Já enfileirados?
          const ids = rows.map((r) => r.id as string);
          const { data: existing } = await supabaseAdmin
            .from("pix_recovery_queue")
            .select("pedido_id")
            .in("pedido_id", ids);
          const existingSet = new Set((existing ?? []).map((r) => r.pedido_id as string));

          const novos = rows.filter((r) => !existingSet.has(r.id as string));
          let enqueued = 0;
          let valorEmRisco = 0;

          if (novos.length > 0) {
            const inserts = novos.map((r) => ({
              pedido_id: r.id,
              mercado_pago_id: r.mercado_pago_id ?? null,
              valor: Number(r.valor ?? 0),
              rede_social: r.rede_social ?? null,
              pacote: r.pacote ?? null,
              whatsapp: null,
              instagram_user: r.instagram_user ?? null,
              status: "novo",
              first_seen_at: new Date().toISOString(),
              next_action_at: new Date().toISOString(),
            }));
            const { error: insErr } = await supabaseAdmin.from("pix_recovery_queue").insert(inserts);
            if (!insErr) {
              enqueued = inserts.length;
              valorEmRisco = inserts.reduce((a, b) => a + Number(b.valor || 0), 0);
            }
          }

          // Alerta Telegram só se algo novo E tem valor
          if (enqueued > 0 && valorEmRisco > 0) {
            try {
              const { dispatchTelegramAlert } = await import("@/lib/messaging");
              const valorFmt = valorEmRisco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
              await dispatchTelegramAlert(
                `💰 PIX PARA RECUPERAR\n\n` +
                `PROBLEMA: ${enqueued} novo(s) pedido(s) com Pix pendente. ${valorFmt} em risco.\n\n` +
                `O QUE FAZER: abra o painel admin → Central de Recuperação e envie o WhatsApp em 1 clique.`,
              );
            } catch { /* silencioso */ }
          }

          // Auto-desqualifica: pedido já foi pago depois? marca como recuperado
          const { data: pagos } = await supabaseAdmin
            .from("pedidos")
            .select("id, status")
            .in("id", ids)
            .in("status", ["approved", "paid", "provisioning", "provisioned", "completed"]);
          const idsPagos = (pagos ?? []).map((p) => p.id as string);
          if (idsPagos.length > 0) {
            await supabaseAdmin
              .from("pix_recovery_queue")
              .update({ status: "recuperado" })
              .in("pedido_id", idsPagos)
              .neq("status", "recuperado");
          }

          return Response.json({ ok: true, scanned: rows.length, enqueued, valor_em_risco: valorEmRisco });
        } catch (e) {
          return Response.json({ ok: false, error: e instanceof Error ? e.message : "erro" }, { status: 500 });
        }
      },
    },
  },
});
