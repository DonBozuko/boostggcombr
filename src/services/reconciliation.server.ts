// v179 — Reconciliação Diária (MP × pedidos × ledger)
// Roda às 06:00 e compara 3 fontes de verdade para as últimas 24h:
//   A) Receita real MP (soma pedidos.valor com status paid/waiting_provision/Enviado)
//   B) Ledger financeiro (soma faturamento em admin_treasury)
//   C) Custo real gasto (soma custo_real)
// Divergência > R$1 → alerta Telegram imediato.

export type ReconReport = {
  ok: boolean;
  periodo_horas: number;
  receita_pedidos: number;
  receita_ledger: number;
  divergencia_receita: number;
  custo_total: number;
  lucro_bruto: number;
  pedidos_paid_sem_ledger: string[];
  pedidos_ledger_sem_paid: string[];
  ts: string;
};

export async function runReconciliation(hours = 24): Promise<ReconReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const report: ReconReport = {
    ok: true,
    periodo_horas: hours,
    receita_pedidos: 0,
    receita_ledger: 0,
    divergencia_receita: 0,
    custo_total: 0,
    lucro_bruto: 0,
    pedidos_paid_sem_ledger: [],
    pedidos_ledger_sem_paid: [],
    ts: new Date().toISOString(),
  };

  const { data: pedidos } = await supabaseAdmin
    .from("pedidos")
    .select("id, valor, custo_real, status, mercado_pago_id")
    .in("status", ["paid", "waiting_provision", "Enviado"])
    .gte("created_at", since);

  const pedidosMap = new Map<string, { valor: number; custo: number }>();
  for (const p of (pedidos as any[]) ?? []) {
    report.receita_pedidos += Number(p.valor) || 0;
    report.custo_total += Number(p.custo_real) || 0;
    pedidosMap.set(p.id, { valor: Number(p.valor) || 0, custo: Number(p.custo_real) || 0 });
  }

  const { data: ledger } = await supabaseAdmin
    .from("financial_ledger" as any)
    .select("pedido_id, valor_brl, origem")
    .eq("origem", "mercado_pago")
    .gte("created_at", since);

  const ledgerSet = new Set<string>();
  for (const l of (ledger as any[]) ?? []) {
    report.receita_ledger += Number(l.valor_brl) || 0;
    if (l.pedido_id) ledgerSet.add(l.pedido_id);
  }

  // Pedidos paid sem ledger (bug: dinheiro entrou, não foi contabilizado)
  for (const [id] of pedidosMap) {
    if (!ledgerSet.has(id)) report.pedidos_paid_sem_ledger.push(id);
  }
  // Ledger sem pedido paid (bug: ledger fantasma)
  for (const id of ledgerSet) {
    if (!pedidosMap.has(id)) report.pedidos_ledger_sem_paid.push(id);
  }

  report.divergencia_receita = Number((report.receita_pedidos - report.receita_ledger).toFixed(2));
  report.lucro_bruto = Number((report.receita_pedidos - report.custo_total).toFixed(2));

  if (
    Math.abs(report.divergencia_receita) > 1 ||
    report.pedidos_paid_sem_ledger.length > 0 ||
    report.pedidos_ledger_sem_paid.length > 0
  ) {
    report.ok = false;
    try {
      const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
      const parts = [`📊 CONTAS NÃO BATEM (${hours}h)`];
      parts.push(`\nPROBLEMA: o dinheiro dos pedidos não fecha com o dinheiro registrado no caixa.`);
      parts.push(`\nPedidos: R$${report.receita_pedidos.toFixed(2)}`);
      parts.push(`Caixa:   R$${report.receita_ledger.toFixed(2)}`);
      parts.push(`Diferença: R$${report.divergencia_receita.toFixed(2)}`);
      if (report.pedidos_paid_sem_ledger.length > 0)
        parts.push(`⚠️ ${report.pedidos_paid_sem_ledger.length} pedido(s) pago(s) que NÃO entraram no caixa`);
      if (report.pedidos_ledger_sem_paid.length > 0)
        parts.push(`⚠️ ${report.pedidos_ledger_sem_paid.length} lançamento(s) no caixa SEM pedido pago`);
      parts.push(`\nO QUE FAZER: me manda esse alerta que eu audito hoje mesmo.`);
      await dispatchWhatsappAlert(parts.join("\n")).catch(() => {});
    } catch { /* */ }
  }

  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@reconciliation",
      action: "reconciliation_v179",
      detail: report as any,
      created_at: new Date().toISOString(),
    } as any);
  } catch { /* */ }

  return report;
}
