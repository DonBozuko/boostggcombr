// v219 — Delivery Watcher: poll dos fornecedores para saber se o pedido
// realmente foi entregue (remains=0), não só despachado.
//
// Fluxo:
// - payment-contingency marca status='processing' após dispatch OK
// - este watcher (cron 30min) consulta o endpoint action=status dos fornecedores
//   para todos os pedidos em 'processing' com provider_order_id
// - remains=0 (ou status Completed) → status='completed'
// - > 24h em 'processing' e ainda com remains > 0 → alerta Telegram (não estorna
//   automático porque parte já pode ter caído; decisão manual)
// - erro de rede/API → só loga, tenta de novo na próxima varredura

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ProviderStatus = {
  status?: string;
  remains?: string | number;
  start_count?: string | number;
  charge?: string | number;
  error?: string;
};

const ENDPOINTS: Record<string, { url: string; key: string | undefined }> = {
  smmhype: { url: "https://smmhype.com/api/v2", key: process.env.SMMHYPE_API_KEY },
  smmpainel: { url: "https://smmpainel.com/api/v2", key: process.env.SMMPAINEL_API_KEY },
  verified: { url: "https://verifiedatacado.com/api/v2", key: process.env.VERIFIED_API_KEY },
};

const STUCK_ALERT_HOURS = 24;

async function fetchStatus(slug: string, orderId: string): Promise<ProviderStatus | null> {
  const cfg = ENDPOINTS[slug];
  if (!cfg || !cfg.key) return null;
  try {
    const body = new URLSearchParams({ key: cfg.key, action: "status", order: String(orderId) });
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return (await res.json()) as ProviderStatus;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

function isDelivered(s: ProviderStatus): boolean {
  const status = String(s.status ?? "").toLowerCase();
  const remains = Number(s.remains ?? -1);
  if (["completed", "partial", "concluído", "concluido"].includes(status)) return true;
  if (!isNaN(remains) && remains === 0) return true;
  return false;
}

export type DeliveryReport = {
  scanned: number;
  concluidos: number;
  ainda_processando: number;
  travados_alertados: number;
  erros: number;
  detalhes: Array<{ id: string; provider: string; order: string; result: string }>;
  ts: string;
};

export async function runDeliveryWatcher(): Promise<DeliveryReport> {
  const report: DeliveryReport = {
    scanned: 0,
    concluidos: 0,
    ainda_processando: 0,
    travados_alertados: 0,
    erros: 0,
    detalhes: [],
    ts: new Date().toISOString(),
  };

  // Últimas 48h — janela ampla o suficiente pra pegar tudo em processing
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: pedidos, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, provider_slug, provider_order_id, dispatched_at, instagram_user, pacote, quantidade, valor, alerted_at")
    .eq("status", "processing")
    .not("provider_order_id", "is", null)
    .not("provider_slug", "is", null)
    .gte("dispatched_at", since)
    .limit(200);

  if (error) {
    report.erros++;
    report.detalhes.push({ id: "-", provider: "-", order: "-", result: `load error: ${error.message}` });
    return report;
  }

  const rows = (pedidos as any[]) ?? [];
  report.scanned = rows.length;

  const stuckAlerts: string[] = [];

  for (const p of rows) {
    const slug = String(p.provider_slug);
    const orderId = String(p.provider_order_id);
    const s = await fetchStatus(slug, orderId);
    if (!s || s.error) {
      report.erros++;
      report.detalhes.push({ id: p.id, provider: slug, order: orderId, result: `err: ${s?.error ?? "no cfg"}` });
      continue;
    }

    if (isDelivered(s)) {
      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "completed",
          last_reconciled_at: new Date().toISOString(),
          error_detail: `Entrega confirmada · ${slug} (order ${orderId}) · remains=${s.remains ?? 0}`,
        } as any)
        .eq("id", p.id)
        .eq("status", "processing");
      report.concluidos++;
      report.detalhes.push({ id: p.id, provider: slug, order: orderId, result: `DELIVERED (remains=${s.remains})` });
      continue;
    }

    report.ainda_processando++;
    report.detalhes.push({ id: p.id, provider: slug, order: orderId, result: `IN_PROGRESS remains=${s.remains}` });

    // Trava anti-spam: alerta uma vez só (alerted_at)
    const dispatchedAt = p.dispatched_at ? new Date(p.dispatched_at).getTime() : 0;
    const ageHours = dispatchedAt ? (Date.now() - dispatchedAt) / 3_600_000 : 0;
    if (ageHours > STUCK_ALERT_HOURS && !p.alerted_at) {
      await supabaseAdmin
        .from("pedidos")
        .update({ alerted_at: new Date().toISOString() } as any)
        .eq("id", p.id);
      stuckAlerts.push(
        `• ${p.id.slice(0, 8)} · ${slug}#${orderId} · @${String(p.instagram_user ?? "").replace(/^https?:\/\/[^/]+\//, "").slice(0, 30)} · ${p.pacote} · faltam ${s.remains}/${p.quantidade}`,
      );
      report.travados_alertados++;
    }
  }

  if (stuckAlerts.length > 0) {
    try {
      const { dispatchTelegramAlert } = await import("@/lib/messaging");
      await dispatchTelegramAlert(
        `⏰ ENTREGA DEMORANDO MAIS QUE O NORMAL\n\n` +
        `PROBLEMA: ${stuckAlerts.length} pedido(s) despachado(s) há mais de ${STUCK_ALERT_HOURS}h ainda não terminaram de cair.\n\n` +
        stuckAlerts.join("\n") +
        `\n\nO QUE FAZER: abre o painel do fornecedor, confere se travou. Se sim, reprocessa ou reembolsa manual pelo Mercado Pago.`,
      );
    } catch { /* silencioso */ }
  }

  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@delivery-watcher",
      action: "delivery_watcher_v219",
      detail: report as any,
      created_at: new Date().toISOString(),
    });
  } catch { /* */ }

  return report;
}
