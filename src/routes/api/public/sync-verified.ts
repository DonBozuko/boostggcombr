import { createFileRoute } from "@tanstack/react-router";

function extractToken(request: Request) {
  return (
    request.headers.get("x-admin-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  );
}

async function authorized(request: Request) {
  const token = extractToken(request);
  if (!token) return false;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return true;
  if (process.env.CRON_ADMIN_TOKEN && token === process.env.CRON_ADMIN_TOKEN) return true;
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
  } catch { return false; }
}

async function run(request: Request) {
  if (!(await authorized(request))) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const { syncVerified } = await import("@/lib/sync-services.server");
    const res = await syncVerified();
    return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/sync-verified")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});
