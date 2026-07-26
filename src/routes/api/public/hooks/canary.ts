import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/canary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isCronAuthorized } = await import("@/lib/cron-auth.server");
        if (!isCronAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const force = url.searchParams.get("force") === "1";
        const { runCanary } = await import("@/services/canary.server");
        const report = await runCanary(force);
        return Response.json(report, { status: report.ok ? 200 : 503 });
      },
    },
  },
});
