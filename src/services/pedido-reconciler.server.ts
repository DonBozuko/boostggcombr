// v179 Etapa 3 — Reconciliador Universal de Pedidos
// Roda a cada 5min via pg_cron. Trava anti-regressão obrigatória:
// pedidos pagos NUNCA podem ficar esquecidos sem dispatch.
//
// Regras:
// A) Órfãos: status=paid + provider_order_id IS NULL + created_at > 10min
//    → tenta redispatch via payment-contingency (confirmAndDispatchIfPaid).
//    Se falhar após 3 tentativas → alerta WhatsApp/Telegram vermelho.
// B) Duplicidade: pedido com provider_order_id preenchido é IMUTÁVEL
//    (o UPDATE .is("provider_order_id", null) já bloqueia).

export type ReconcilerReport = {
  ok: boolean;
  orfaos_encontrados: number;
  redispatch_sucesso: number;
  redispatch_falha: number;
  alertas_disparados: number;
  detalhes: Array<{ id: string; created_at: string; result: string }>;
  ts: string;
};

const ORFAO_MIN_IDADE_MIN = 10; // pedido pago há mais de 10min sem dispatch = suspeito
const MAX_TENTATIVAS_RECONCILIADOR = 3;

export async function runPedidoReconciler(): Promise<ReconcilerReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const report: ReconcilerReport = {
    ok: true,
    orfaos_encontrados: 0,
    redispatch_sucesso: 0,
    redispatch_falha: 0,
    alertas_disparados: 0,
    detalhes: [],
    ts: new Date().toISOString(),
  };

  const cutoff = new Date(Date.now() - ORFAO_MIN_IDADE_MIN * 60_000).toISOString();

  // Órfãos: pagos há mais de 10min sem provider_order_id
  const { data: orfaos } = await supabaseAdmin
    .from("pedidos")
    .select("id, created_at, pacote, quantidade, instagram_user, valor, reconcile_attempts, mercado_pago_id")
    .eq("status", "paid")
    .is("provider_order_id", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(50);

  report.orfaos_encontrados = (orfaos ?? []).length;

  const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");

  for (const p of (orfaos as any[]) ?? []) {
    const tentativas = Number(p.reconcile_attempts ?? 0);

    // Estoura limite de tentativas: alerta e para de tentar
    if (tentativas >= MAX_TENTATIVAS_RECONCILIADOR) {
      report.alertas_disparados++;
      report.detalhes.push({ id: p.id, created_at: p.created_at, result: "LIMITE_TENTATIVAS_ATINGIDO" });
      await dispatchWhatsappAlert(
        `🚨 PEDIDO PAGO SEM ENVIO (${tentativas}x)\n` +
        `\nPROBLEMA: cliente pagou há ${Math.round((Date.now() - new Date(p.created_at).getTime()) / 60000)}min mas o pedido não entrou pra nenhum fornecedor.` +
        `\nPedido: ${p.id.slice(0, 8)} · @${p.instagram_user} · R$${Number(p.valor).toFixed(2)}` +
        `\n\nO QUE FAZER: abre o admin, procura esse pedido, e ou reprocessa manualmente ou reembolsa o cliente pelo Mercado Pago.`,
      ).catch(() => {});
      continue;
    }

    // Marca tentativa antes de tentar (evita loop se dispatch travar)
    await supabaseAdmin
      .from("pedidos")
      .update({ reconcile_attempts: tentativas + 1, last_reconciled_at: new Date().toISOString() } as any)
      .eq("id", p.id);

    try {
      const { redispatchPaidOrphan } = await import("@/lib/payment-contingency.server");
      const r = await redispatchPaidOrphan(p.id);
      if (r.ok) {
        report.redispatch_sucesso++;
        report.detalhes.push({ id: p.id, created_at: p.created_at, result: `OK_${r.fornecedor}` });
      } else {
        report.redispatch_falha++;
        report.detalhes.push({ id: p.id, created_at: p.created_at, result: `FALHA: ${r.error}` });
      }
    } catch (e) {
      report.redispatch_falha++;
      report.detalhes.push({ id: p.id, created_at: p.created_at, result: `EXCEPTION: ${(e as Error).message}` });
    }
  }

  // v208 — SWEEP DE PENDING: pedidos em 'pending' há > 30min sem paid nem cancel.
  // Antes: só o polling do cliente (aba aberta) chamava confirmAndDispatchIfPaid.
  // Se o cliente fechava a aba após pagar e o webhook falhava, o pedido virava zumbi eterno.
  // Agora: reconciliador varre o MP direto pelos pending antigos.
  const PENDING_CUTOFF_MIN = 30;
  const pendingCutoff = new Date(Date.now() - PENDING_CUTOFF_MIN * 60_000).toISOString();
  const { data: pendings } = await supabaseAdmin
    .from("pedidos")
    .select("id, created_at, mercado_pago_id, valor, instagram_user")
    .in("status", ["pending", "mp_pending", "mp_in_process"])
    .not("mercado_pago_id", "is", null)
    .lt("created_at", pendingCutoff)
    .order("created_at", { ascending: true })
    .limit(50);

  const pendingList = (pendings as any[]) ?? [];
  if (pendingList.length > 0) {
    const { confirmAndDispatchIfPaid } = await import("@/lib/payment-contingency.server");
    for (const p of pendingList) {
      try {
        const r = await confirmAndDispatchIfPaid(p.id);
        report.detalhes.push({
          id: p.id,
          created_at: p.created_at,
          result: `PENDING_SWEEP: ${r.ok ? (r.recovered ? "RECOVERED" : `status=${r.status}`) : `err=${r.error}`}`,
        });
      } catch (e) {
        report.detalhes.push({ id: p.id, created_at: p.created_at, result: `PENDING_SWEEP_EX: ${(e as Error).message}` });
      }
    }
  }

  // Log de auditoria (mesmo quando 0 órfãos — prova que o cron rodou)
  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@pedido-reconciler",
      action: "pedido_reconciler_v208",
      detail: report as any,
      created_at: new Date().toISOString(),
    });
  } catch { /* */ }

  if (report.redispatch_falha > 0 && report.alertas_disparados === 0) {
    report.ok = false;
  }
  return report;
}
