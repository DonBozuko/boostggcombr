// v180 — SLA Watcher: retenta pedidos parqueados (waiting_provision) e refunda expirados.
// Roda a cada 15min via cron. Complementa auto-healer sem sobrepor responsabilidade.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { confirmAndDispatchIfPaid } from "@/lib/payment-contingency.server";
import { refundMercadoPago } from "@/lib/dispatcher-fallback.server";

type SlaReport = {
  scanned: number;
  redispatched: number;
  refunded: number;
  refund_failed: number;
  errors: string[];
  ts: string;
};

export async function runSlaWatcher(): Promise<SlaReport> {
  const report: SlaReport = {
    scanned: 0,
    redispatched: 0,
    refunded: 0,
    refund_failed: 0,
    errors: [],
    ts: new Date().toISOString(),
  };

  const { data: parqueados, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, sla_deadline, mercado_pago_id, valor, pacote")
    .eq("status", "waiting_provision")
    .not("sla_deadline", "is", null);

  if (error) {
    report.errors.push(`load waiting_provision failed: ${error.message}`);
    return report;
  }

  const rows = (parqueados as any[]) ?? [];
  report.scanned = rows.length;
  const now = Date.now();

  for (const p of rows) {
    const deadline = new Date(p.sla_deadline).getTime();
    const expired = deadline < now;

    if (!expired) {
      // Tenta redispatch — se saldo foi recarregado, entra no dispatch normal
      try {
        // Volta pra pending temporariamente pra confirmAndDispatch reprocessar
        await supabaseAdmin
          .from("pedidos")
          .update({ status: "pending" } as any)
          .eq("id", p.id)
          .eq("status", "waiting_provision");

        const r = await confirmAndDispatchIfPaid(p.id);
        if (r.ok && r.status === "paid") {
          report.redispatched++;
        } else {
          // Não conseguiu — volta pra waiting_provision preservando deadline
          await supabaseAdmin
            .from("pedidos")
            .update({ status: "waiting_provision" } as any)
            .eq("id", p.id)
            .eq("status", "pending");
        }
      } catch (e: any) {
        report.errors.push(`retry ${p.id}: ${e?.message ?? "unknown"}`);
      }
      continue;
    }

    // Expirado — refund automático
    if (!p.mercado_pago_id) {
      await supabaseAdmin
        .from("pedidos")
        .update({ status: "SMM_FAILED", error_detail: "SLA expirado sem mercado_pago_id" } as any)
        .eq("id", p.id);
      report.refund_failed++;
      continue;
    }

    // v181 — refund com retry 3x (backoff 500ms → 1.5s → 4.5s) antes de cair em SMM_FAILED
    let refund = await refundMercadoPago(String(p.mercado_pago_id));
    const refundAttempts: string[] = [`t1: ${refund.ok ? "OK" : refund.detail}`];
    for (let attempt = 2; attempt <= 3 && !refund.ok; attempt++) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt - 2)));
      refund = await refundMercadoPago(String(p.mercado_pago_id));
      refundAttempts.push(`t${attempt}: ${refund.ok ? "OK" : refund.detail}`);
    }
    await supabaseAdmin
      .from("pedidos")
      .update({
        status: refund.ok ? "mp_refunded" : "SMM_FAILED",
        error_detail: `SLA 24h expirado. Refund ${refund.ok ? "OK" : "FALHOU"} (${refundAttempts.join(" | ")})`.slice(0, 500),
      } as any)
      .eq("id", p.id);

    if (refund.ok) report.refunded++;
    else report.refund_failed++;

    try {
      const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
      await dispatchWhatsappAlert(
        refund.ok
          ? `🔄 REFUND AUTOMÁTICO (SLA)\n\nPedido ${p.id.slice(0, 8)} · R$${Number(p.valor).toFixed(2)}\nSLA de 24h expirou sem recarga. Cliente reembolsado.`
          : `🚨 REFUND FALHOU (SLA)\n\nPedido ${p.id.slice(0, 8)} · R$${Number(p.valor).toFixed(2)}\nMP retornou erro: ${refund.detail}\n\nAÇÃO MANUAL NECESSÁRIA.`,
      ).catch(() => {});
    } catch { /* */ }
  }

  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@sla-watcher",
      action: "sla_watcher_v180",
      detail: report as any,
      created_at: new Date().toISOString(),
    } as any);
  } catch (e: any) {
    report.errors.push(`audit log failed: ${e?.message ?? "unknown"}`);
  }

  return report;
}
