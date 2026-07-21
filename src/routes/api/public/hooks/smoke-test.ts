import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/smoke-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if ((!process.env.ADMIN_TOKEN && !process.env.CRON_ADMIN_TOKEN) || (token !== process.env.ADMIN_TOKEN && token !== process.env.CRON_ADMIN_TOKEN)) {
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
