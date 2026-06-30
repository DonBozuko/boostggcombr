import { createFileRoute } from "@tanstack/react-router";

// Server-Side CAPI: recebe eventos do beacon mascarado /~flock.js
// e encaminha (server-to-server) para Meta CAPI / GA4 quando configurado.
// Sem credenciais → grava no Supabase para auditoria, sem quebrar.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function forwardMetaCapi(event: any) {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return { ok: false, skipped: "no-meta-creds" };
  try {
    const r = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: event?.e?.name ?? "PageView",
          event_time: Math.floor((event?.t ?? Date.now()) / 1000),
          event_source_url: event?.u,
          action_source: "website",
        }],
      }),
    });
    return { ok: r.ok, status: r.status };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

export const Route = createFileRoute("/~api/analytics")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let payload: any = null;
        try { payload = await request.json(); } catch { /* ignore */ }
        const result = await forwardMetaCapi(payload);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("admin_audit_logs").insert({
            action: "capi_event",
            details: { event: payload, forwarded: result },
          } as any);
        } catch { /* tabela ausente / sem RLS — não quebra o beacon */ }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});
