import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/smoke-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { runSmokeTest } = await import("@/services/smoke-test.server");
        const report = await runSmokeTest();
        return new Response(JSON.stringify(report), {
          status: report.ok ? 200 : 503,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
