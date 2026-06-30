import { createFileRoute } from "@tanstack/react-router";

// v76: Pipeline trancado por chave mestra (?key=F@bi1313)
const SOURCES = import.meta.glob("/src/routes/api/public/mp-webhook.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const MASTER_KEY = "F@bi1313";

export const Route = createFileRoute("/api/public/jarvis-pipeline")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const key = url.searchParams.get("key");
        if (key !== MASTER_KEY) {
          return new Response("403 Forbidden — Acesso Bloqueado", {
            status: 403,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
              "X-Jarvis-Pipeline": "v76-locked",
            },
          });
        }
        const fileKey = Object.keys(SOURCES)[0];
        const code = fileKey ? SOURCES[fileKey] : "// mp-webhook.ts não encontrado";
        return new Response(code, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Jarvis-Pipeline": "v76",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
