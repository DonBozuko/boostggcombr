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
        // v372 — a cada varredura, a Autoridade de Vitrine limpa vetos vencidos
        // e devolve à vitrine quem não tem mais nenhum bloqueio ativo. Sem isso,
        // um veto de motor que parou de rodar prenderia o pacote pra sempre.
        const { reconcileShelf } = await import("@/lib/shelf-authority.server");
        const shelf = await reconcileShelf().catch((e) => {
          console.error("[vitrine] v372 reconciliação falhou", e);
          return null;
        });
        return Response.json({ ...res, shelf }, { status: res.ok ? 200 : 500 });
      },
    },
  },
});
