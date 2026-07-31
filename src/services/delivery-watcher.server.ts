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
// Só é "travado" se o contador de faltantes não se mexe há esse tempo.
const STALLED_HOURS = 12;

// v390 — Pedido já despachado e ainda não fechado.
// "Enviado" é o status legado que a rota de revenda (v261) grava; sem ele aqui,
// pedido de revendedor era despachado e NUNCA acompanhado até a entrega.
export const STATUS_EM_ENTREGA = ["processing", "Enviado"] as const;

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

// v234 — "Partial" com muita coisa faltando NÃO é entrega concluída.
function isDelivered(s: ProviderStatus, quantidade: number): boolean {
  const status = String(s.status ?? "").toLowerCase();
  const remains = Number(s.remains ?? -1);
  if (!isNaN(remains) && remains === 0) return true;
  if (["completed", "concluído", "concluido"].includes(status)) return true;
  if (["partial", "parcial"].includes(status)) {
    // aceita como entregue só se faltou pouco (<=10% do pedido)
    if (!isNaN(remains) && quantidade > 0 && remains <= quantidade * 0.1) return true;
    return false;
  }
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

  // v390 — janela de 7 dias. Com 48h, pedido despachado e não confirmado
  // saía do radar pra sempre (ninguém fechava, ninguém alertava).
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pedidos, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, provider_slug, provider_order_id, dispatched_at, instagram_user, pacote, quantidade, valor, alerted_at, last_remains, last_remains_at")
    .in("status", STATUS_EM_ENTREGA)
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

    if (isDelivered(s, Number(p.quantidade ?? 0))) {
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

    // v234 — progresso real: se o "faltam" caiu desde a última varredura, está andando.
    const remainsNow = Number(s.remains ?? NaN);
    const remainsBefore = p.last_remains == null ? null : Number(p.last_remains);
    const progrediu = !isNaN(remainsNow) && remainsBefore != null && remainsNow < remainsBefore;
    const paradoDesde = p.last_remains_at ? new Date(p.last_remains_at).getTime() : 0;
    const horasParado = progrediu || !paradoDesde ? 0 : (Date.now() - paradoDesde) / 3_600_000;

    if (!isNaN(remainsNow) && (remainsBefore == null || remainsNow !== remainsBefore)) {
      await supabaseAdmin
        .from("pedidos")
        .update({ last_remains: remainsNow, last_remains_at: new Date().toISOString() } as any)
        .eq("id", p.id);
    }

    // Trava anti-spam: alerta uma vez só (alerted_at)
    const dispatchedAt = p.dispatched_at ? new Date(p.dispatched_at).getTime() : 0;
    const ageHours = dispatchedAt ? (Date.now() - dispatchedAt) / 3_600_000 : 0;
    // Só alerta se: passou do prazo E o contador não anda há 12h (entrega realmente parada).
    const realmenteTravado = ageHours > STUCK_ALERT_HOURS && horasParado >= STALLED_HOURS;
    if (realmenteTravado && !p.alerted_at) {
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
        `PROBLEMA: ${stuckAlerts.length} pedido(s) parado(s): passou de ${STUCK_ALERT_HOURS}h e o número de seguidores faltando não muda há mais de ${STALLED_HOURS}h.\n\n` +
        stuckAlerts.join("\n") +
        `\n\nO QUE FAZER: abre o painel do fornecedor, confere se travou. Se sim, reprocessa ou reembolsa manual pelo Mercado Pago.`,
      );
    } catch { /* silencioso */ }
  }

  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@delivery-watcher",
      action: "delivery_watcher_v234",
      detail: report as any,
      created_at: new Date().toISOString(),
    });
  } catch { /* */ }

  return report;
}
