// v151 — Reprocessamento manual de pedidos travados em waiting_provision.
// Acionado pelo botão inline "✅ Recarga Confirmada" do Telegram.

export type ReprocessResult =
  | { ok: true; fornecedor: string; orderId: string | null; custoBrl: number | null }
  | { ok: false; error: string; tentativas?: string[] };

export async function reprocessWaitingProvision(pedidoId: string): Promise<ReprocessResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, pacote, quantidade, instagram_user, valor")
    .eq("id", pedidoId)
    .maybeSingle();
  if (error || !pedido) return { ok: false, error: "PEDIDO_NAO_ENCONTRADO" };
  if (pedido.status !== "waiting_provision" && pedido.status !== "MARGIN_HOLD" && pedido.status !== "SMM_FAILED") {
    return { ok: false, error: `STATUS_${pedido.status}` };
  }

  const { rankProvidersByCost, markProviderUnstable, clearProviderUnstable } = await import("@/lib/smart-routing.server");
  const { dispatchByFornecedor } = await import("@/lib/dispatcher-fallback.server");
  const { respectsMinMargin } = await import("@/lib/margin-guardian");

  const cadeia = await rankProvidersByCost({ pacote: pedido.pacote, quantidade: Number(pedido.quantidade) });
  if (!cadeia.length) return { ok: false, error: "SEM_FORNECEDOR_DISPONIVEL" };

  const tentativas: string[] = [];
  for (const f of cadeia) {
    if (Number(f.saldo_atual) <= 0) {
      tentativas.push(`${f.nome}: saldo zerado`);
      await markProviderUnstable(f.slug, "saldo zerado");
      continue;
    }
    if (f.cost_brl != null && Number(f.saldo_atual) < f.cost_brl) {
      tentativas.push(`${f.nome}: saldo insuf.`);
      await markProviderUnstable(f.slug, "saldo insuficiente");
      continue;
    }
    if (f.cost_brl != null && !respectsMinMargin(Number(pedido.valor), f.cost_brl)) {
      tentativas.push(`${f.nome}: margem <300%`);
      continue;
    }
    const r = await dispatchByFornecedor(f.slug, {
      pacote: pedido.pacote,
      quantidade: Number(pedido.quantidade),
      instagram_user: pedido.instagram_user,
      serviceIdOverride: f.provider_service_id ?? null,
    });
    if (r.ok) {
      await clearProviderUnstable(f.slug);
      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "paid",
          error_detail: `v151 recarga manual · Enviado via ${f.nome} (order ${r.orderId ?? "?"})`,
          ...(f.cost_brl != null ? { custo_real: Number(f.cost_brl.toFixed(4)) } : {}),
        })
        .eq("id", pedido.id);
      // Registra ledger de auditoria PROVIDER_RECHARGE_MANUAL
      try {
        await supabaseAdmin.from("financial_ledger" as any).insert({
          valor_brl: Number(pedido.valor),
          origem: "wallet:reservado",
          destino: "wallet:geral",
          pedido_id: String(pedido.id),
          telemetry: {
            event: "PROVIDER_RECHARGE_MANUAL",
            provider: f.slug,
            provider_nome: f.nome,
            order_id: r.orderId ?? null,
            cost_brl: f.cost_brl ?? null,
            tentativas,
            ts: new Date().toISOString(),
          },
        } as any);
      } catch (e) { console.warn("[reprocess] ledger fail", e); }
      try {
        await supabaseAdmin.from("admin_audit_logs" as any).insert({
          admin_email: "telegram@admin",
          action: "PROVIDER_RECHARGE_MANUAL",
          detail: { pedido_id: pedido.id, provider: f.slug, order_id: r.orderId ?? null, tentativas },
        } as any);
      } catch (e) { console.warn("[reprocess] audit fail", e); }
      return { ok: true, fornecedor: f.nome, orderId: r.orderId != null ? String(r.orderId) : null, custoBrl: f.cost_brl ?? null };
    }
    tentativas.push(`${f.nome}: ${r.error}${r.status ? ` HTTP ${r.status}` : ""}`);
    await markProviderUnstable(f.slug, r.error ?? "dispatch fail");
  }

  return { ok: false, error: "TODOS_FORNECEDORES_FALHARAM", tentativas };
}
