// v186 — Endpoint tocável do Telegram: 1-clique reprocessa pedido travado.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export function signPedidoToken(pedidoId: string, secret: string): string {
  return createHmac("sha256", secret).update(`reprocess:${pedidoId}`).digest("hex").slice(0, 16);
}

function html(title: string, body: string, color = "#0ea5e9") {
  return new Response(
    `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:system-ui;background:#0b1220;color:#fff;margin:0;padding:24px;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="max-width:420px;background:#111827;border-left:6px solid ${color};padding:24px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.5)">
<h1 style="margin:0 0 12px;font-size:20px">${title}</h1><div style="font-size:15px;line-height:1.5;opacity:.9">${body}</div>
</div></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/hooks/reprocess-one")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        const token = url.searchParams.get("t") ?? "";
        const secret = process.env.ADMIN_TOKEN;
        if (!secret) return html("⚠️ Erro de configuração", "ADMIN_TOKEN ausente no servidor.", "#dc2626");
        if (!id || !token) return html("❌ Link inválido", "Faltam parâmetros id/token.", "#dc2626");

        const expected = signPedidoToken(id, secret);
        const a = Buffer.from(token);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return html("❌ Token inválido", "Este link não é autêntico ou expirou.", "#dc2626");
        }

        try {
          const { reprocessWaitingProvision } = await import("@/lib/reprocess-waiting.server");
          const result = await reprocessWaitingProvision({ pedidoId: id });
          if (result.ok) {
            return html(
              "✅ Pedido reprocessado",
              `<b>Fornecedor:</b> ${result.fornecedor}<br><b>Order ID:</b> ${result.orderId ?? "—"}<br><b>Custo:</b> R$ ${(result.custoBrl ?? 0).toFixed(2)}<br><br>Pode fechar essa aba.`,
              "#10b981",
            );
          }
          return html(
            "❌ Todos fornecedores falharam",
            `<b>Erro:</b> ${result.error}<br><b>Tentativas:</b><br>${(result.tentativas ?? []).map((t) => `• ${t}`).join("<br>") || "—"}<br><br>Abra /admin para tratar manual.`,
            "#dc2626",
          );
        } catch (e) {
          return html("💥 Erro interno", String(e instanceof Error ? e.message : e), "#dc2626");
        }
      },
    },
  },
});
