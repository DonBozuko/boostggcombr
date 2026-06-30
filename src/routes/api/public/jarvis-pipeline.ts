import { createFileRoute } from "@tanstack/react-router";

// v75: Direct API Context Pipeline — serve o código bruto do mp-webhook.ts
// como text/plain para bypass de limite de caracteres em chats.
const SOURCES = import.meta.glob("/src/routes/api/public/mp-webhook.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const Route = createFileRoute("/api/public/jarvis-pipeline")({
  server: {
    handlers: {
      GET: async () => {
        const key = Object.keys(SOURCES)[0];
        const code = key ? SOURCES[key] : "// mp-webhook.ts não encontrado";
        return new Response(code, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Jarvis-Pipeline": "v75",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
