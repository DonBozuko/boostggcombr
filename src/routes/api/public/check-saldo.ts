import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/check-saldo")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { checkSmmhypeBalance } = await import("@/lib/monitor-saldo.server");
          const res = await checkSmmhypeBalance();
          return new Response(JSON.stringify(res), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => {
        const { checkSmmhypeBalance } = await import("@/lib/monitor-saldo.server");
        const res = await checkSmmhypeBalance();
        return new Response(JSON.stringify(res), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
