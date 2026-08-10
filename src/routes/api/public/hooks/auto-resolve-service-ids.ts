import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/auto-resolve-service-ids")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.replace(/^Bearer\s+/i, "").trim() || (request.headers.get("x-admin-token") || "").trim();
        if (!(await (await import("@/lib/admin-guard.server")).assertAdmin(token, "route:auto-resolve-service-ids", { allowCron: true })).ok) {
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
