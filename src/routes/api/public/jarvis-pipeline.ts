import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/jarvis-pipeline")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const key = request.headers.get("x-admin-token") ?? url.searchParams.get("token") ?? "";
        if (!process.env.ADMIN_TOKEN || key !== process.env.ADMIN_TOKEN) {
          return new Response("403 Forbidden — Acesso Bloqueado", {
            status: 403,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Jarvis-Pipeline": "v76-locked",
            },
          });
        }
        return Response.json({
          ok: true,
          pipeline: "mp-webhook",
          status: "registered",
          source_exposure: "disabled",
          ts: new Date().toISOString(),
        }, {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "X-Jarvis-Pipeline": "v76",
          },
        });
      },
    },
  },
});
