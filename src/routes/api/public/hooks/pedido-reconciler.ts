import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/pedido-reconciler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isCronAuthorized } = await import("@/lib/cron-auth.server");
        if (!isCronAuthorized(request)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { runPedidoReconciler } = await import("@/services/pedido-reconciler.server");
        const report = await runPedidoReconciler();
        return new Response(JSON.stringify(report), {
          status: report.ok ? 200 : 503,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
