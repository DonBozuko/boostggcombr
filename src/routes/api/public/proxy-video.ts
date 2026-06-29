import { createFileRoute } from "@tanstack/react-router";

// Same-origin proxy para vídeos de fundo do Media Mockup Viewer.
// Anula CORS do canvas: o navegador trata como recurso local.
export const Route = createFileRoute("/api/public/proxy-video")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url");
        if (!url || !/^https?:\/\//i.test(url)) {
          return new Response("bad url", { status: 400 });
        }
        try {
          const upstream = await fetch(url, { redirect: "follow" });
          if (!upstream.ok || !upstream.body) {
            return new Response("upstream error", { status: 502 });
          }
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch {
          return new Response("fetch failed", { status: 502 });
        }
      },
    },
  },
});
