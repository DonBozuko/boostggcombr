// v187 — Reprocessa manualmente um pedido travado em waiting_provision.
// Dispara dispatch A→B→C imediato. Auth: header `x-admin-token: <ADMIN_TOKEN>`.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({ pedido_id: z.string().min(1) });

export const Route = createFileRoute("/api/public/queue/reprocess")({
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
          return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT" }), {
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
