// v161 — Confirmação do robô externo: marca pedido como enviado (paid) e
// debita o valor do saldo reservado (via reprocessWaitingProvision).
// Autenticação: header `x-admin-token: <ADMIN_TOKEN>`.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  pedido_id: z.string().min(1),
  provider_order_id: z.string().optional(),
  fornecedor: z.string().optional(),
});

export const Route = createFileRoute("/api/public/queue/confirm")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        let body: unknown;
        try { body = await request.json(); } catch { body = null; }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT", detail: parsed.error.flatten() }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { reprocessWaitingProvision } = await import("@/lib/reprocess-waiting.server");
        const result = await reprocessWaitingProvision(parsed.data.pedido_id);
        const status = result.ok ? 200 : 422;
        return new Response(JSON.stringify(result), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
