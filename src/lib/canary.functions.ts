import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


const tokenIn = z.object({ token: z.string().min(8) });

export const getCanaryPanel = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenIn.parse(i))
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCanaryConfig, canarySpendThisMonth } = await import("@/services/canary.server");
    const cfg = await getCanaryConfig();
    const gasto_mes_brl = await canarySpendThisMonth();

    const [{ data: runs }, { data: quarentena }, { data: alertas }] = await Promise.all([
      supabaseAdmin
        .from("canary_runs")
        .select("id, created_at, pacote, quantidade, provider_slug, provider_order_id, status, remains, delivered_at, detail, cost_brl")
        .order("created_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("canary_quarantine" as never)
        .select("pacote, provider_slug, until, reason, hits")
        .order("until", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("canary_alert_state" as never)
        .select("alert_key, last_sent_at, resolved_at, detail")
        .order("last_sent_at", { ascending: false })
        .limit(10),
    ]);
    const agora = Date.now();
    return {
      ok: true as const,
      config: cfg,
      gasto_mes_brl,
      runs: (runs as any[]) ?? [],

      quarentena: (((quarentena as any[]) ?? []).filter((q) => new Date(q.until).getTime() > agora)) as any[],
      alertas_abertos: (((alertas as any[]) ?? []).filter((a) => !a.resolved_at)) as any[],
    };
  });


export const saveCanaryConfig = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    tokenIn.extend({
      enabled: z.boolean(),
      alvos: z.array(z.object({
        rede: z.string().max(40),
        link: z.string().max(1200),
        pacote: z.string().max(120),
        quantidade: z.number().int().min(0).max(5000),
        ativo: z.boolean(),
        intervalo_horas: z.number().int().min(0).max(720).optional(),
      })).max(12),

      interval_hours: z.number().int().min(1).max(168),
      sla_hours: z.number().int().min(1).max(72),
      budget_brl_month: z.number().min(0).max(2000).optional(),

    }).parse(i),
  )
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const value = {
      enabled: data.enabled,
      alvos: data.alvos
        .map((a) => ({
          ...a,
          rede: a.rede.trim(),
          link: a.link.trim(),
          pacote: a.pacote.trim(),
          intervalo_horas: a.intervalo_horas ?? 0,
        }))
        .filter((a) => a.link || a.pacote),

      interval_hours: data.interval_hours,
      sla_hours: data.sla_hours,
      budget_brl_month: data.budget_brl_month ?? 40,

    };
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ key: "canary_config", value: value as any, updated_at: new Date().toISOString(), updated_by: "admin" } as any, { onConflict: "key" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });


/** v284 — sugere o pacote real mais barato de cada rede para usar como canário.
 *  Não cria pacote fake: usa o catálogo que o cliente compra de verdade. */
export const suggestCanaryTargets = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenIn.parse(i))
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("pricing_items")
      .select("pacote, category, quantidade, cost_brl, is_sellable");
    const best = new Map<string, { rede: string; pacote: string; quantidade: number; cost_brl: number }>();
    for (const r of ((rows as any[]) ?? [])) {
      if (r.is_sellable === false) continue;
      const rede = String(r.category ?? "").split(":")[0] || "outros";
      const cur = best.get(String(r.category));
      const cost = Number(r.cost_brl ?? 0);
      if (!cur || cost < cur.cost_brl) {
        best.set(String(r.category), { rede: String(r.category), pacote: r.pacote, quantidade: Number(r.quantidade), cost_brl: cost });
      }
      void rede;
    }
    // v369 — rede cara (custo do teste acima de R$ 1) só precisa ser provada a
    // cada 48h; rede de centavos roda a cada 12h. Mesma prova, metade do gasto.
    return {
      ok: true as const,
      sugestoes: [...best.values()]
        .sort((a, b) => a.rede.localeCompare(b.rede))
        .map((s) => ({ ...s, intervalo_horas: s.cost_brl > 1 ? 48 : 12 })),
    };
  });


export const runCanaryNow = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenIn.parse(i))
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { runCanary } = await import("@/services/canary.server");
    const report = await runCanary(true);
    return { ok: true as const, report };
  });
