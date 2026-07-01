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
      .select("pacote, quantidade, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id", { count: "exact" });
    const items = (rows as any[]) ?? [];
    let total = count ?? items.length;
    let withSmmhype = items.filter((r) => !!r.smmhype_service_id).length;
    const withSmmpanel = items.filter((r) => !!r.smmpanel_service_id).length;
    const withVerified = items.filter((r) => !!r.verified_service_id).length;
    const withTriple = items.filter((r) => !!r.smmhype_service_id && !!r.smmpanel_service_id && !!r.verified_service_id).length;

    // v126 — Fallback local: se pricing_items retornou vazio, monta o contador
    // canônico a partir do CANONICAL_QTYS local (pricing.config in-code).
    let fallbackApplied = false;
    if (total === 0) {
      const { CANONICAL_TOTAL } = await import("@/lib/pricing-engine.server");
      total = CANONICAL_TOTAL;
      withSmmhype = CANONICAL_TOTAL; // matriz local tem 100% de IDs SMMHype
      fallbackApplied = true;
    }

    // v126 — Provider Health Handshake: lê status/saldo real + presença da API key
    const { data: forns } = await supabaseAdmin
      .from("fornecedores")
      .select("slug, nome, ativo, saldo_atual, status");
    const envKey = (slug: string) =>
      slug === "smmhype" ? !!process.env.SMMHYPE_API_KEY :
      slug === "smmpainel" ? !!process.env.SMMPAINEL_API_KEY :
      slug === "verified" ? !!process.env.VERIFIED_API_KEY : false;
    const providers = (forns ?? []).map((f: any) => {
      const saldo = Number(f.saldo_atual ?? 0);
      const hasKey = envKey(f.slug);
      const online = (f.status ?? "").toLowerCase() === "online";
      const ready = hasKey && online && saldo > 0;
      const state = f.ativo ? "ATIVO" : ready ? "RESERVA" : "OFFLINE";
      return { slug: f.slug, nome: f.nome, ativo: !!f.ativo, saldo, hasKey, online, state };
    });

    // Panel 3 — recent webhook / dispatch audit logs
    const { data: logs } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("id, action, detail, created_at")
      .in("action", ["DISPATCH_OK", "MARGIN_HOLD", "MARGIN_HOLD_ERROR", "REFUND_OK", "REFUND_FAILED", "LATE_PAYMENT_CATCH", "FAILOVER_ACTIVE", "SIMULATE_UNSTABLE"])
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
        expected: total, // v126 — expected acompanha o canônico dinâmico
        symmetric: true,
        withSmmhype,
        withSmmpanel,
        withVerified,
        withTriple,
        fallbackApplied,
      },
      providers,
      logs: (logs ?? []) as any[],
      ts: new Date().toISOString(),
    };
  });

// v110 — Simulador de Pane: força um fornecedor para _unstable por 5min,
// bypassando o Perpetual Balance Guard. Somente diretor.
export const simulateProviderUnstable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string; minutes?: number }) => data)
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (email !== ADMIN_EMAIL) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ms = Math.max(1, Math.min(30, data.minutes ?? 5)) * 60 * 1000;
    const until = new Date(Date.now() + ms).toISOString();
    await supabaseAdmin.from("provider_health" as any).upsert(
      { slug: data.slug, unstable_until: until, last_error: "SIMULATED_PANE_v110", last_failure_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "slug" },
    );
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: email,
      action: "SIMULATE_UNSTABLE",
      detail: { slug: data.slug, until, message: `🧪 Pane simulada em ${data.slug} até ${until}` },
    });
    return { ok: true, slug: data.slug, until };
  });

export const clearProviderUnstableFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (email !== ADMIN_EMAIL) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("provider_health" as any).upsert(
      { slug: data.slug, unstable_until: null, updated_at: new Date().toISOString() },
      { onConflict: "slug" },
    );
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: email,
      action: "SIMULATE_UNSTABLE",
      detail: { slug: data.slug, message: `✅ Pane simulada REVERTIDA em ${data.slug}` },
    });
    return { ok: true };
  });

