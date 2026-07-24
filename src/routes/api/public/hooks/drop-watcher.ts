import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/drop-watcher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isCronAuthorized } = await import("@/lib/cron-auth.server");
        if (!isCronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runDropWatcher } = await import("@/services/drop-watcher.server");
        const report = await runDropWatcher();
        return Response.json(report);
      },
    },
  },
});
