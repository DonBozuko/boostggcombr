// v162 — GET/POST pricing_config (admin). Auth: header x-admin-token.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  profit_multiplier: z.number().positive().max(20),
  coupon_buffer: z.number().positive().max(3),
  gateway_net: z.number().positive().max(1),
  floor_brl: z.number().positive().max(100),
});

export const Route = createFileRoute("/api/public/admin/pricing-config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        const { getPricingConfig } = await import("@/lib/pricing-config.server");
        const cfg = await getPricingConfig();
        return new Response(JSON.stringify({ ok: true, config: cfg }), { headers: { "Content-Type": "application/json" } });
      },
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        let body: unknown;
        try { body = await request.json(); } catch { body = null; }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ ok: false, error: "INVALID", detail: parsed.error.flatten() }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("admin_settings" as any)
          .upsert({ key: "pricing_config", value: parsed.data as any, updated_at: new Date().toISOString() } as any, { onConflict: "key" });
        if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
        const { invalidatePricingConfigCache } = await import("@/lib/pricing-config.server");
        invalidatePricingConfigCache();
        return new Response(JSON.stringify({ ok: true, config: parsed.data }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
