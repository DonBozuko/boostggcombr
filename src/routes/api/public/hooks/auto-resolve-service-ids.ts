import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/auto-resolve-service-ids")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        const admin = process.env.ADMIN_TOKEN;
        const cron = process.env.CRON_ADMIN_TOKEN;
        if (!token || (token !== admin && token !== cron)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        const { autoResolveAll } = await import("@/lib/auto-resolver.server");
        const results = await autoResolveAll();
        return new Response(JSON.stringify({ ok: true, results }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
