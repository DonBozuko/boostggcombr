import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/sla-watcher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if ((!process.env.ADMIN_TOKEN && !process.env.CRON_ADMIN_TOKEN) || (token !== process.env.ADMIN_TOKEN && token !== process.env.CRON_ADMIN_TOKEN)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runSlaWatcher } = await import("@/services/sla-watcher.server");
        const report = await runSlaWatcher();
        return Response.json(report);
      },
    },
  },
});
