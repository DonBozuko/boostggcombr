import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).optional().nullable(),
  utm_source: z.string().max(100).optional().nullable(),
  utm_medium: z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(200).optional().nullable(),
  device_id: z.string().max(64).optional().nullable(),
  session_id: z.string().max(64).optional().nullable(),
});

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          const parsed = schema.safeParse(body);
          if (!parsed.success) {
            return new Response("bad_request", { status: 400 });
          }

          // Bot filter simples
          const ua = request.headers.get("user-agent") ?? "";
          if (/bot|crawler|spider|preview|monitor|curl|wget/i.test(ua)) {
            return new Response("ok", { status: 204 });
          }

          const country = request.headers.get("cf-ipcountry") ?? null;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("page_views").insert({
            path: parsed.data.path.slice(0, 500),
            referrer: parsed.data.referrer?.slice(0, 500) ?? null,
            utm_source: parsed.data.utm_source ?? null,
            utm_medium: parsed.data.utm_medium ?? null,
            utm_campaign: parsed.data.utm_campaign ?? null,
            device_id: parsed.data.device_id ?? null,
            session_id: parsed.data.session_id ?? null,
            user_agent: ua.slice(0, 300),
            country,
          });

          return new Response("ok", { status: 204 });
        } catch {
          // Nunca falhar o beacon — apenas ignora
          return new Response("ok", { status: 204 });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
