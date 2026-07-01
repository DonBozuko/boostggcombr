import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PROFIT_MULT,
  COUPON_BUFFER,
  PIX_NET,
  MIN_NET_PROFIT_RATIO,
  computeGuardedPrice,
  estimateNetProfit,
} from "@/lib/margin-guardian";

const ADMIN_EMAIL = "fabiano.majestic@gmail.com";

export const getClaudeInspect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (email !== ADMIN_EMAIL) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Panel 2 — pricing_items canonical count + triple-ID coverage
    const { data: rows, count } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, quantidade, valor, smmhype_service_id, smmpanel_service_id, verified_service_id", { count: "exact" });
    const items = (rows as any[]) ?? [];
    const total = count ?? items.length;
    const withSmmhype = items.filter((r) => !!r.smmhype_service_id).length;
    const withSmmpanel = items.filter((r) => !!r.smmpanel_service_id).length;
    const withVerified = items.filter((r) => !!r.verified_service_id).length;
    const withTriple = items.filter((r) => !!r.smmhype_service_id && !!r.smmpanel_service_id && !!r.verified_service_id).length;

    // Panel 3 — recent webhook / dispatch audit logs
    const { data: logs } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("id, acao, detalhe, created_at")
      .in("acao", ["DISPATCH_OK", "MARGIN_HOLD", "REFUND_OK", "LATE_PAYMENT_CATCH", "mp_rejected_insufficient"])
      .order("created_at", { ascending: false })
      .limit(30);

    // Panel 1 — sample proof of formula (cost=1.00 BRL)
    const sampleCost = 1;
    const samplePrice = computeGuardedPrice(sampleCost);
    const sampleNet = estimateNetProfit(samplePrice, sampleCost);

    return {
      ok: true,
      formula: {
        raw: "price = (cost × 4.0 × 1.15) / 0.9901",
        PROFIT_MULT,
        COUPON_BUFFER,
        PIX_NET,
        MIN_NET_PROFIT_RATIO,
        marginActive: MIN_NET_PROFIT_RATIO >= 3.0,
        sample: { costBrl: sampleCost, priceBrl: samplePrice, netProfitBrl: sampleNet },
      },
      catalog: {
        total,
        expected: 200,
        symmetric: total === 200,
        withSmmhype,
        withSmmpanel,
        withVerified,
        withTriple,
      },
      logs: (logs ?? []) as any[],
      ts: new Date().toISOString(),
    };
  });
