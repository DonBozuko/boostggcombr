// Server-only: contingency confirmation + auto-dispatch when the MP webhook fails.
// Called by the client polling fallback (getPedidoStatus) to break the
// "Aguardando pagamento..." infinite loop when handshakes are lost.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchByFornecedor, refundMercadoPago } from "./dispatcher-fallback.server";

const MP_PAYMENTS_ENDPOINT = "https://api.mercadopago.com/v1/payments";

export type ContingencyResult =
  | { ok: true; status: string; recovered: boolean; note?: string }
  | { ok: false; status: string | null; error: string };

export async function confirmAndDispatchIfPaid(pedidoId: string): Promise<ContingencyResult> {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, pacote, quantidade, instagram_user, valor, mercado_pago_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (error || !pedido) return { ok: false, status: null, error: "PEDIDO_NOT_FOUND" };

  // Already advanced — nothing to do.
  if (pedido.status !== "pending") {
    return { ok: true, status: pedido.status, recovered: false };
  }
  if (!pedido.mercado_pago_id) {
    return { ok: true, status: pedido.status, recovered: false };
  }

  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!mpToken) return { ok: false, status: pedido.status, error: "MP_TOKEN_MISSING" };

  // 1) Direct read of payment status (fallback when webhook never arrived)
  let payment: { status?: string; status_detail?: string; transaction_amount?: number } = {};
  try {
    const r = await fetch(`${MP_PAYMENTS_ENDPOINT}/${pedido.mercado_pago_id}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
      cache: "no-store",
    });
    if (!r.ok) return { ok: true, status: pedido.status, recovered: false };
    payment = await r.json();
  } catch (e) {
    console.warn("[contingency] MP fetch falhou", e);
    return { ok: true, status: pedido.status, recovered: false };
  }

  // v96 — Strict Client-Side Gateway Handshake: recusa por saldo insuficiente do comprador.
  if (payment.status === "rejected") {
    const detail = String(payment.status_detail ?? "");
    const isInsufficient = /insufficient_amount|insufficient_funds|cc_rejected_insufficient/i.test(detail);
    const newStatus = isInsufficient ? "mp_rejected_insufficient" : `mp_${payment.status}`;
    const msg = isInsufficient
      ? `Recusado pela instituição financeira: saldo insuficiente (${detail})`
      : `MP rejected: ${detail || "sem detalhe"}`;
    await supabaseAdmin
      .from("pedidos")
      .update({ status: newStatus, error_detail: msg })
      .eq("id", pedido.id)
      .eq("status", "pending");
    if (isInsufficient) {
      try {
        await supabaseAdmin.from("admin_audit_logs" as any).insert({
          admin_email: "system@checkout",
          action: "CHECKOUT_INSUFFICIENT_FUNDS",
          detail: {
            ts: new Date().toISOString(),
            pedido_id: pedido.id,
            payment_id: pedido.mercado_pago_id,
            status_detail: detail,
            message: `❌ [CHECKOUT] Tentativa de pagamento recusada por saldo insuficiente do cliente`,
          },
        } as any);
      } catch (e) { console.warn("[contingency] audit insufficient fail", e); }
    }
    return { ok: true, status: newStatus, recovered: false };
  }

  if (payment.status !== "approved") {
    return { ok: true, status: pedido.status, recovered: false };
  }

  // 2) Valor confere?
  const expectedCents = Math.round(Number(pedido.valor) * 100);
  const paidCents = Math.round(Number(payment.transaction_amount ?? 0) * 100);
  if (expectedCents !== paidCents) {
    await supabaseAdmin
      .from("pedidos")
      .update({
        status: "amount_mismatch",
        error_detail: `Contingência: esperado R$${pedido.valor} · recebido R$${payment.transaction_amount}`,
      })
      .eq("id", pedido.id);
    return { ok: true, status: "amount_mismatch", recovered: false };
  }

  // 3) Marca como paid (idempotente — só se ainda estiver pending)
  const { data: upd } = await supabaseAdmin
    .from("pedidos")
    .update({ status: "paid", error_detail: "Contingência: webhook ausente, polling confirmou pagamento." })
    .eq("id", pedido.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!upd) {
    // outro processo já avançou
    const { data: fresh } = await supabaseAdmin.from("pedidos").select("status").eq("id", pedido.id).maybeSingle();
    return { ok: true, status: fresh?.status ?? "paid", recovered: false };
  }

  // v154 — Live Webhook Heartbeat + Telegram universal (paridade com mp-webhook.ts)
  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@contingency",
      action: "PIX_APPROVED",
      detail: {
        ts: new Date().toISOString(),
        payment_id: String(pedido.mercado_pago_id),
        pedido_id: pedido.id,
        pacote: pedido.pacote,
        quantidade: pedido.quantidade,
        valor_brl: Number(pedido.valor),
        buyer: pedido.instagram_user,
        source: "contingency-polling",
        message: `🟢 [contingency] PIX aprovado via polling · pedido ${pedido.id}`,
      },
    } as any);
  } catch (e) { console.warn("[contingency] v154 audit PIX_APPROVED fail", e); }

  try {
    const { pickCheapestFornecedorSlug } = await import("@/lib/smart-routing.server");
    const cheapestSlug = await pickCheapestFornecedorSlug(pedido.pacote, Number(pedido.quantidade)).catch(() => null);
    const { notifyAdminUniversalPaid } = await import("@/lib/whatsapp-admin.server");
    await notifyAdminUniversalPaid({
      pedidoId: String(pedido.id),
      vendaBrl: Number(pedido.valor),
      compradorHandle: pedido.instagram_user ?? null,
      pacote: pedido.pacote ?? null,
      quantidade: Number(pedido.quantidade) || null,
      fornecedor: cheapestSlug ?? "smmhype",
    });
  } catch (e) { console.warn("[contingency] v155 telegram universal fail", e); }


  // 4) Dispatch failover A→B→C (somente fornecedores ativos com saldo > 0)
  const { data: fornecedores } = await supabaseAdmin
    .from("fornecedores")
    .select("slug, nome, ativo, saldo_atual")
    .eq("ativo", true)
    .gt("saldo_atual", 0)
    .order("prioridade", { ascending: true });

  const cadeia = fornecedores ?? [];
  if (!cadeia.length) {
    await supabaseAdmin
      .from("pedidos")
      .update({ status: "SMM_FAILED", error_detail: "Contingência: nenhum fornecedor com saldo." })
      .eq("id", pedido.id);
    return { ok: true, status: "SMM_FAILED", recovered: false };
  }

  const tentativas: string[] = [];
  let sucesso = false;
  let fornecedorOk: string | null = null;
  let orderIdOk: string | number | null = null;

  for (const f of cadeia) {
    const r = await dispatchByFornecedor(f.slug, {
      pacote: pedido.pacote,
      quantidade: pedido.quantidade,
      instagram_user: pedido.instagram_user,
    });
    if (r.ok) {
      sucesso = true;
      fornecedorOk = f.nome;
      orderIdOk = r.orderId ?? null;
      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "paid",
          error_detail: `Contingência OK · ${f.nome} (order ${r.orderId ?? "?"})`,
        })
        .eq("id", pedido.id);
      break;
    }
    tentativas.push(`${f.nome}: ${r.error}${r.status ? ` HTTP ${r.status}` : ""}`);
  }

  // 5) Log de auditoria — TI consome via jarvis_alerts
  try {
    await supabaseAdmin.from("jarvis_alerts").insert({
      severidade: sucesso ? "warning" : "critical",
      origem: "contingency-pooling",
      mensagem: sucesso
        ? "⚠️ Webhook instável - Pooling de contingência executou a ordem com sucesso"
        : "🚨 Webhook instável E todos fornecedores falharam no pooling de contingência",
      detalhe: JSON.stringify({
        pedidoId: pedido.id,
        mp: pedido.mercado_pago_id,
        fornecedor: fornecedorOk,
        orderId: orderIdOk,
        tentativas,
      }).slice(0, 1000),
    });
  } catch (e) {
    console.warn("[contingency] jarvis_alerts insert falhou", e);
  }

  if (!sucesso) {
    const refund = await refundMercadoPago(String(pedido.mercado_pago_id));
    await supabaseAdmin
      .from("pedidos")
      .update({
        status: refund.ok ? "mp_refunded" : "SMM_FAILED",
        error_detail: `Contingência falhou em todos fornecedores. ${tentativas.join(" | ")}`.slice(0, 500),
      })
      .eq("id", pedido.id);
    return { ok: true, status: refund.ok ? "mp_refunded" : "SMM_FAILED", recovered: false };
  }

  return { ok: true, status: "paid", recovered: true, note: `via ${fornecedorOk}` };
}
