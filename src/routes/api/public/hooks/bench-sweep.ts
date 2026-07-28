import { createFileRoute } from "@tanstack/react-router";

// v323 — Bancada Autônoma (cron). Roda a decisão real do checkout em TODOS os
// pacotes, grava no banco, corrige o que dá e só chama o dono quando precisa.
export const Route = createFileRoute("/api/public/hooks/bench-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isCronAuthorized } = await import("@/lib/cron-auth.server");
        if (!isCronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runBenchAutonomo } = await import("@/services/bench-autonomo.server");
        const res = await runBenchAutonomo({ notify: true, origem: "cron" });
        return Response.json(res, { status: res.ok ? 200 : 500 });
      },
    },
  },
});
