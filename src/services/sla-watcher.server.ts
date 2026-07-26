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
    .select("id, status, sla_deadline, mercado_pago_id, valor, pacote, email_contato, reseller_id, reseller_valor")
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

    // Expirado
    if (!p.mercado_pago_id) {
      await supabaseAdmin
        .from("pedidos")
        .update({ status: "SMM_FAILED", error_detail: "SLA expirado sem mercado_pago_id" } as any)
        .eq("id", p.id);
      report.refund_failed++;
      continue;
    }

    // v220 — Política B: auto-refund apenas até R$ 50. Acima disso, aguarda aprovação humana.
    const valor = Number(p.valor ?? 0);
    const AUTO_REFUND_CAP = 50;
    if (valor > AUTO_REFUND_CAP) {
      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "AWAITING_REFUND_APPROVAL",
          error_detail: `SLA 24h expirado · R$${valor.toFixed(2)} > R$${AUTO_REFUND_CAP} → aguardando aprovação humana no painel.`,
        } as any)
        .eq("id", p.id);
      try {
        const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
        await dispatchWhatsappAlert(
          `🛑 REEMBOLSO PRECISA DE APROVAÇÃO\n\nPROBLEMA: pedido de R$${valor.toFixed(2)} passou de 24h sem entregar. Valor alto pra devolver sozinho.\n\nPedido ${p.id.slice(0, 8)} · ${p.pacote}\n\nO QUE FAZER: abre o admin, vai na Fila e clica em "Aprovar Refund" (ou "Reprocessar" se der pra tentar de novo).`,
        ).catch(() => {});
      } catch { /* */ }
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
        error_detail: `SLA 24h expirado (auto). Refund ${refund.ok ? "OK" : "FALHOU"} (${refundAttempts.join(" | ")})`.slice(0, 500),
      } as any)
      .eq("id", p.id);

    if (refund.ok) report.refunded++;
    else report.refund_failed++;


    // v215 — Aviso ao cliente por e-mail quando refund automático dá certo
    if (refund.ok) {
      const email = String(p.email_contato ?? "").toLowerCase().trim();
      const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes("anonimizado") && !email.endsWith("@webhook");
      if (validEmail) {
        try {
          await supabaseAdmin.rpc("enqueue_email" as any, {
            queue_name: "transactional_emails",
            payload: {
              template_name: "refund-notice",
              recipient_email: email,
              idempotency_key: `refund-notice-${p.id}`,
              template_data: {
                pacote: p.pacote ?? null,
                valor: Number(p.valor ?? 0).toFixed(2).replace(".", ","),
                pedidoId: String(p.id).slice(0, 8),
              },
            },
          } as any);
        } catch (e: any) {
          report.errors.push(`refund email enqueue ${p.id}: ${e?.message ?? "unknown"}`);
        }
      }
    }

    try {
      const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
      await dispatchWhatsappAlert(
        refund.ok
          ? `🔄 CLIENTE REEMBOLSADO AUTOMÁTICO\n\nPROBLEMA: passaram 24h sem recarregar o fornecedor.\n\nPedido ${p.id.slice(0, 8)} · R$${Number(p.valor).toFixed(2)}\n\nO QUE FAZER: nada. Dinheiro já voltou pro cliente e ele foi avisado por e-mail.`
          : `🚨 NÃO CONSEGUI REEMBOLSAR O CLIENTE\n\nPROBLEMA: passaram 24h, tentei devolver o dinheiro e o Mercado Pago recusou.\nErro: ${refund.detail}\n\nPedido ${p.id.slice(0, 8)} · R$${Number(p.valor).toFixed(2)}\n\nO QUE FAZER: abrir Mercado Pago e reembolsar na mão AGORA.`,
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
