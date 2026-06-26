import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy estático com Content-Type carimbado para áudios do Jarvis.
 * Resolve bloqueio silencioso de navegadores em mp3 sem MIME explícito.
 * Suporta Range → responde 206 Partial Content quando solicitado.
 */
const ALLOW = new Set(["welcome", "optimized", "warning", "critical", "fail"]);

async function serve(request: Request, name: string) {
  const clean = name.replace(/\?.*$/, "").replace(/\.mp3$/i, "");
  if (!ALLOW.has(clean)) return new Response("not found", { status: 404 });

  const upstream = new URL(`/assets/sounds/jarvis-fx/${clean}.mp3`, request.url);
  const range = request.headers.get("range");
  const res = await fetch(upstream.toString(), {
    headers: range ? { range } : {},
  });
  if (!res.ok && res.status !== 206) {
    return new Response("upstream error", { status: 502 });
  }

  const headers = new Headers(res.headers);
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  return new Response(res.body, { status: res.status, headers });
}

export const Route = createFileRoute("/api/public/sfx/$name")({
  server: {
    handlers: {
      GET: ({ request, params }) => serve(request, params.name),
      HEAD: ({ request, params }) => serve(request, params.name),
    },
  },
});
