import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/sla-watcher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isCronAuthorized } = await import("@/lib/cron-auth.server");
        if (!isCronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runSlaWatcher } = await import("@/services/sla-watcher.server");
        const report = await runSlaWatcher();
        return Response.json(report);
      },
    },
  },
});
