// v220 — SLO Panel: métricas reais de saúde operacional dos últimos 7 dias.
// Sem inventar dado: tudo lido de pedidos + admin_audit_logs.
import { createServerFn } from "@tanstack/react-start";

type SloMetrics = {
  ok: boolean;
  windowDays: number;
  totals: {
    pagos: number;
    entregues: number;
    processando: number;
    refunded: number;
    awaiting_approval: number;
    smm_failed: number;
    margin_hold: number;
    revenue_brl: number;
  };
  deliveryLatency: {
    p50Min: number | null;
    p95Min: number | null;
    maxMin: number | null;
    sample: number;
  };
  successRate: number; // % de pedidos pagos que viraram completed/processing (não falharam)
  refundRatePct: number; // % refunded sobre total pagos
  perDay: Array<{ day: string; pagos: number; entregues: number; refunded: number; failed: number }>;
  /** v354 — medidor real de 30 dias (substitui o "% de sistema pronto"). */
  maturity: import("@/lib/maturity-metrics").MaturityMetrics | null;
  generatedAt: string;
};

export const getSloMetrics = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<SloMetrics> => {
    const admin = process.env.ADMIN_TOKEN;
    if (!admin || data.token !== admin) {
      return {
        ok: false, windowDays: 7,
        totals: { pagos: 0, entregues: 0, processando: 0, refunded: 0, awaiting_approval: 0, smm_failed: 0, margin_hold: 0, revenue_brl: 0 },
        deliveryLatency: { p50Min: null, p95Min: null, maxMin: null, sample: 0 },
        successRate: 0, refundRatePct: 0, perDay: [], maturity: null, generatedAt: new Date().toISOString(),
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sinceISO = since.toISOString();

    const { data: rows } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, valor, created_at, dispatched_at, last_reconciled_at")
      .gte("created_at", sinceISO)
      .limit(5000);

    const list = (rows as any[]) ?? [];

    // v354 — medidor de 30 dias: autonomia, tempo pago→entregue e estornos.
    const { computeMaturity } = await import("@/lib/maturity-metrics");
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows30 } = await supabaseAdmin
      .from("pedidos")
      .select("status, created_at, dispatched_at, last_reconciled_at, error_detail")
      .gte("created_at", since30)
      .limit(20000);
    const maturity = computeMaturity((rows30 as any[]) ?? [], 30);

    const PAID = new Set(["paid", "pago", "processing", "completed", "concluido", "concluído", "Enviado", "provisioning", "provisioned"]);
    const DELIVERED = new Set(["completed", "concluido", "concluído", "Enviado"]);
    const FAILED = new Set(["SMM_FAILED", "mp_rejected", "mp_unknown"]);

    let pagos = 0, entregues = 0, processando = 0, refunded = 0, awaiting = 0, failed = 0, marginHold = 0, revenue = 0;
    const latencyMin: number[] = [];
    const perDayMap = new Map<string, { pagos: number; entregues: number; refunded: number; failed: number }>();

    for (const r of list) {
      const st = String(r.status ?? "");
      const day = String(r.created_at ?? "").slice(0, 10);
      if (!perDayMap.has(day)) perDayMap.set(day, { pagos: 0, entregues: 0, refunded: 0, failed: 0 });
      const bucket = perDayMap.get(day)!;

      if (PAID.has(st)) {
        pagos++;
        bucket.pagos++;
        revenue += Number(r.valor ?? 0);
      }
      if (DELIVERED.has(st)) { entregues++; bucket.entregues++; }
      if (st === "processing") processando++;
      if (st === "mp_refunded") { refunded++; bucket.refunded++; }
      if (st === "AWAITING_REFUND_APPROVAL") awaiting++;
      if (FAILED.has(st)) { failed++; bucket.failed++; }
      if (st === "MARGIN_HOLD") marginHold++;

      // Latência de entrega: dispatched_at → last_reconciled_at (quando virou completed)
      if (DELIVERED.has(st) && r.dispatched_at && r.last_reconciled_at) {
        const d = new Date(r.dispatched_at).getTime();
        const c = new Date(r.last_reconciled_at).getTime();
        if (c > d) latencyMin.push((c - d) / 60000);
      }
    }

    latencyMin.sort((a, b) => a - b);
    const pct = (p: number) => latencyMin.length ? latencyMin[Math.min(latencyMin.length - 1, Math.floor(p * latencyMin.length))] : null;
    const p50 = pct(0.5);
    const p95 = pct(0.95);
    const maxL = latencyMin.length ? latencyMin[latencyMin.length - 1] : null;

    const totalPagosPlusFailed = pagos + failed + refunded;
    const successRate = totalPagosPlusFailed > 0 ? (pagos / totalPagosPlusFailed) * 100 : 100;
    const refundRatePct = totalPagosPlusFailed > 0 ? (refunded / totalPagosPlusFailed) * 100 : 0;

    const perDay = Array.from(perDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({ day, ...v }));

    return {
      ok: true,
      windowDays: 7,
      totals: {
        pagos, entregues, processando, refunded,
        awaiting_approval: awaiting, smm_failed: failed, margin_hold: marginHold,
        revenue_brl: Math.round(revenue * 100) / 100,
      },
      deliveryLatency: {
        p50Min: p50 != null ? Math.round(p50) : null,
        p95Min: p95 != null ? Math.round(p95) : null,
        maxMin: maxL != null ? Math.round(maxL) : null,
        sample: latencyMin.length,
      },
      successRate: Math.round(successRate * 10) / 10,
      refundRatePct: Math.round(refundRatePct * 10) / 10,
      perDay,
      maturity,
      generatedAt: new Date().toISOString(),
    };
  });
