// v172 — Cron hook que dispara o Auto-Healer a cada 5 min.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/auto-healer")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { runAutoHealer } = await import("@/services/auto-healer.server");
          const report = await runAutoHealer();
          return new Response(JSON.stringify({ ok: true, report }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: e?.message ?? "unknown" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => new Response("auto-healer alive v172", { status: 200 }),
    },
  },
});
