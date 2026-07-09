// v186 — Cron 10min: alerta Telegram com botão "Reprocessar Agora" pra pedidos travados.
import { createFileRoute } from "@tanstack/react-router";
import { signPedidoToken } from "./reprocess-one";

const PUBLIC_BASE = "https://project--c88c4437-6c11-4710-b369-9cb46d021440.lovable.app";

type TravadoRow = {
  id: string;
  pacote: string;
  quantidade: number;
  valor: number;
  instagram_user: string;
  status: string;
  created_at: string;
  alerted_at: string | null;
};

export const Route = createFileRoute("/api/public/hooks/waiting-watcher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        const secret = process.env.ADMIN_TOKEN;
        if (!secret || token !== secret) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");

        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
          .from("pedidos")
          .select("id, pacote, quantidade, valor, instagram_user, status, created_at, alerted_at")
          .in("status", ["waiting_provision", "MARGIN_HOLD", "SMM_FAILED"])
          .lte("created_at", cutoff)
          .limit(20);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const travados = (data ?? []) as unknown as TravadoRow[];
        const results: { id: string; sent: boolean; reason?: string }[] = [];

        for (const p of travados) {
          const last = p.alerted_at ? new Date(p.alerted_at).getTime() : 0;
          if (Date.now() - last < 30 * 60 * 1000) {
            results.push({ id: p.id, sent: false, reason: "cooldown" });
            continue;
          }

          const tkn = signPedidoToken(p.id, secret);
          const link = `${PUBLIC_BASE}/api/public/hooks/reprocess-one?id=${encodeURIComponent(p.id)}&t=${tkn}`;
          const idadeMin = Math.round((Date.now() - new Date(p.created_at).getTime()) / 60000);
          const urgent = idadeMin > 120 ? "🚨 URGENTE " : "⚠️ ";
          const msg =
            `${urgent}Pedido travado há ${idadeMin}min\n\n` +
            `PROBLEMA: pedido não foi enviado ao fornecedor automaticamente.\n` +
            `• ID: ${p.id.slice(0, 8)}\n` +
            `• Cliente: @${p.instagram_user ?? "?"}\n` +
            `• Pacote: ${p.pacote} × ${p.quantidade}\n` +
            `• Valor: R$ ${Number(p.valor ?? 0).toFixed(2)}\n` +
            `• Status: ${p.status}\n\n` +
            `O QUE FAZER: toca no botão abaixo pra tentar de novo em todos fornecedores.`;

          try {
            await dispatchWhatsappAlert(msg, {
              inlineKeyboard: [[{ text: "🔄 Reprocessar Agora", url: link }]],
            });
            await supabaseAdmin
              .from("pedidos")
              .update({ alerted_at: new Date().toISOString() } as never)
              .eq("id", p.id);
            results.push({ id: p.id, sent: true });
          } catch (e) {
            results.push({ id: p.id, sent: false, reason: String(e instanceof Error ? e.message : e) });
          }
        }
        return Response.json({ ok: true, total: results.length, results });
      },
    },
  },
});
