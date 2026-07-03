import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/sla-watcher")({
  server: {
    handlers: {
      POST: async () => {
        const { runSlaWatcher } = await import("@/services/sla-watcher.server");
        const report = await runSlaWatcher();
        return Response.json(report);
      },
    },
  },
});
