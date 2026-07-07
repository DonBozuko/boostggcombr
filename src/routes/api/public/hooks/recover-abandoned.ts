import { createFileRoute } from "@tanstack/react-router";

// Cron hook: detecta pedidos 'pending' >15min sem notificação e dispara Telegram para o admin.
// Chamado por pg_cron a cada 5min. Idempotente — só notifica uma vez por pedido.
export const Route = createFileRoute("/api/public/hooks/recover-abandoned")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { dispatchWhatsappAlert, buildRecoveryWhatsappUrl } = await import("@/lib/whatsapp-alert.server");

        // Busca pedidos pendentes >15min, ainda não notificados.
        const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: rows, error } = await supabaseAdmin
          .from("pedidos")
          .select("id, instagram_user, pacote, quantidade, created_at")
          .eq("status", "pending")
          .is("abandono_notificado_at", null)
          .lt("created_at", cutoff)
          .limit(20);

        if (error) {
          console.error("[recover-abandoned] query fail", error.message);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results: { id: string; sent: boolean; detail?: string }[] = [];
        for (const p of rows ?? []) {
          const handle = p.instagram_user?.startsWith("@") ? p.instagram_user : `@${p.instagram_user}`;
          const msg =
            `🔍 <b>Carrinho abandonado — EliteBoost Prime</b>\n` +
            `Cliente: <b>${handle}</b>\n` +
            `Pacote: <b>${p.pacote} (${p.quantidade})</b>\n` +
            `Ref: <code>${p.id.slice(0, 8)}</code>\n\n` +
            `💡 Toque no botão abaixo para abrir o WhatsApp com a mensagem de recuperação já pronta.`;
          const waUrl = buildRecoveryWhatsappUrl(null);
          const r = await dispatchWhatsappAlert(msg, {
            inlineKeyboard: [[{ text: "🟢 Recuperar venda no WhatsApp", url: waUrl }]],
          });
          if (r.ok) {
            await supabaseAdmin
              .from("pedidos")
              .update({ abandono_notificado_at: new Date().toISOString() })
              .eq("id", p.id);
          }
          results.push({ id: p.id, sent: r.ok, detail: r.detail });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
