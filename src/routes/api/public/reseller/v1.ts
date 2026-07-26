import { createFileRoute } from "@tanstack/react-router";

// v261 — Endpoint público da API de Revenda.
// Compatível com o padrão de painéis SMM: POST com key/action.
// Toda a segurança (chave, saldo, margem, travas BR) fica em reseller-api.server.ts.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
};

export const Route = createFileRoute("/api/public/reseller/v1")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const { handleResellerApi } = await import("@/lib/reseller-api.server");
        return handleResellerApi(request);
      },
      POST: async ({ request }) => {
        const { handleResellerApi } = await import("@/lib/reseller-api.server");
        return handleResellerApi(request);
      },
    },
  },
});
