import { createFileRoute } from "@tanstack/react-router";

function authorized(request: Request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header =
    request.headers.get("x-admin-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("token");
  return header === expected;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
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
}

export const Route = createFileRoute("/api/public/check-saldo")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});
