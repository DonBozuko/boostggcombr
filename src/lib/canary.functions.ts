import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function checkToken(token: string) {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected) && token === expected;
}

const tokenIn = z.object({ token: z.string().min(8) });

export const getCanaryPanel = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenIn.parse(i))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCanaryConfig } = await import("@/services/canary.server");
    const cfg = await getCanaryConfig();
    const { data: runs } = await supabaseAdmin
      .from("canary_runs")
      .select("id, created_at, pacote, quantidade, provider_slug, provider_order_id, status, remains, delivered_at, detail, cost_brl")
      .order("created_at", { ascending: false })
      .limit(15);
    return { ok: true as const, config: cfg, runs: (runs as any[]) ?? [] };
  });

export const saveCanaryConfig = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    tokenIn.extend({
      enabled: z.boolean(),
      link: z.string().max(300),
      pacote: z.string().max(120),
      quantidade: z.number().int().min(0).max(1000),
      interval_hours: z.number().int().min(1).max(168),
      sla_hours: z.number().int().min(1).max(72),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const value = {
      enabled: data.enabled,
      link: data.link.trim(),
      pacote: data.pacote.trim(),
      quantidade: data.quantidade,
      interval_hours: data.interval_hours,
      sla_hours: data.sla_hours,
    };
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ key: "canary_config", value: value as any, updated_at: new Date().toISOString(), updated_by: "admin" } as any, { onConflict: "key" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const runCanaryNow = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenIn.parse(i))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { runCanary } = await import("@/services/canary.server");
    const report = await runCanary(true);
    return { ok: true as const, report };
  });
