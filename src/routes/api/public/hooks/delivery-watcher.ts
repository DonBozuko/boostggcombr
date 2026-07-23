import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/delivery-watcher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isCronAuthorized } = await import("@/lib/cron-auth.server");
        if (!isCronAuthorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runDeliveryWatcher } = await import("@/services/delivery-watcher.server");
        const report = await runDeliveryWatcher();
        return Response.json(report);
      },
    },
  },
});
