import { createFileRoute } from "@tanstack/react-router";

function extractToken(request: Request) {
  return (
    request.headers.get("x-admin-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("token")
  );
}

async function authorized(request: Request) {
  const token = extractToken(request);
  if (!token) return false;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return true;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .schema("vault" as any)
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", "CRON_ADMIN_TOKEN")
      .limit(1)
      .maybeSingle();
    const vaultToken = (data as any)?.decrypted_secret as string | undefined;
    return !!vaultToken && token === vaultToken;
  } catch {
    return false;
  }
}

async function run(request: Request) {
  if (!(await authorized(request))) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const { checkAllProvidersBalance } = await import("@/lib/monitor-saldo.server");
    let fornecedor = new URL(request.url).searchParams.get("fornecedor") ?? undefined;
    if (request.method !== "GET") {
      try {
        const body = await request.clone().json() as { fornecedor?: string; slug?: string; id?: string };
        fornecedor = body.fornecedor ?? body.slug ?? body.id ?? fornecedor;
      } catch {}
    }
    const all = await checkAllProvidersBalance({ fornecedor });
    if (fornecedor && all.results.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "FORNECEDOR_NOT_FOUND" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, results: all.results }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
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
