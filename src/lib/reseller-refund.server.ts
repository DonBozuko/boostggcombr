// v279 — Devolução de saldo em pedidos de revenda.
//
// Causa raiz do defeito: toda a camada de estorno do sistema (SLA watcher,
// contingência de pagamento, aprovação manual) só conhecia Mercado Pago.
// Pedido de revenda é pago com saldo pré-pago e NÃO tem mercado_pago_id.
// Quando esse pedido falhava, o código chamava refundMercadoPago("null"),
// falhava, marcava SMM_FAILED — e o dinheiro do revendedor ficava queimado,
// sem devolução e sem alerta. Perda financeira silenciosa.
//
// Correção: um único resolvedor de estorno. Se o pedido é de revenda, o
// valor volta para a carteira via RPC atômica e idempotente
// (public.reseller_refund_pedido, trava a carteira e não credita duas vezes).

export type RefundOutcome = { ok: boolean; detail: string; kind: "reseller" | "mp" | "none" };

/** true quando o pedido foi pago com saldo de revenda (sem cobrança no MP). */
export function isResellerPaid(pedido: { reseller_id?: unknown; mercado_pago_id?: unknown }): boolean {
  const hasReseller = !!pedido?.reseller_id;
  const mp = String(pedido?.mercado_pago_id ?? "").trim();
  return hasReseller && (mp === "" || mp === "null" || mp === "undefined");
}

/** Devolve o valor do pedido para a carteira do revendedor. Idempotente. */
export async function refundResellerBalance(pedidoId: string, motivo: string): Promise<RefundOutcome> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("reseller_refund_pedido" as any, {
      _pedido_id: pedidoId,
      _motivo: motivo.slice(0, 300),
    } as any);
    if (error) return { ok: false, detail: `rpc: ${error.message}`, kind: "reseller" };
    const row = Array.isArray(data) ? (data as any[])[0] : (data as any);
    if (!row?.ok) return { ok: false, detail: String(row?.motivo ?? "desconhecido"), kind: "reseller" };
    return {
      ok: true,
      detail: row.motivo === "JA_DEVOLVIDO" ? "saldo já havia sido devolvido" : `saldo devolvido (novo: R$${Number(row.saldo).toFixed(2)})`,
      kind: "reseller",
    };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? "exceção", kind: "reseller" };
  }
}

/**
 * Estorno correto para qualquer pedido: revenda → carteira; varejo → Mercado Pago.
 * Nunca chama o MP com id inexistente.
 */
export async function refundPedido(
  pedido: { id: string; reseller_id?: unknown; mercado_pago_id?: unknown },
  motivo: string,
): Promise<RefundOutcome> {
  if (isResellerPaid(pedido)) {
    return refundResellerBalance(String(pedido.id), motivo);
  }
  const mp = String(pedido?.mercado_pago_id ?? "").trim();
  if (!mp || mp === "null") {
    return { ok: false, detail: "pedido sem pagamento rastreável (nem MP, nem revenda)", kind: "none" };
  }
  const { refundMercadoPago } = await import("@/lib/dispatcher-fallback.server");
  let r = await refundMercadoPago(mp);
  const attempts: string[] = [`t1: ${r.ok ? "OK" : r.detail}`];
  for (let i = 2; i <= 3 && !r.ok; i++) {
    await new Promise((res) => setTimeout(res, 500 * Math.pow(3, i - 2)));
    r = await refundMercadoPago(mp);
    attempts.push(`t${i}: ${r.ok ? "OK" : r.detail}`);
  }
  return { ok: r.ok, detail: attempts.join(" | "), kind: "mp" };
}
