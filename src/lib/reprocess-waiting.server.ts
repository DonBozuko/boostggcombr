// v151 — Reprocessamento manual de pedidos travados em waiting_provision.
// Acionado pelo botão inline "✅ Recarga Confirmada" do Telegram.

export type ReprocessResult =
  | { ok: true; fornecedor: string; orderId: string | null; custoBrl: number | null }
  | { ok: false; error: string; tentativas?: string[] };

export type ConfirmRobotDispatchResult =
  | { ok: true; fornecedor: string | null; orderId: string | null; custoBrl: number | null }
  | { ok: false; error: string };

export async function confirmRobotDispatch(input: {
  pedidoId: string;
  providerOrderId?: string | null;
  fornecedor?: string | null;
  valorPagoBrl?: number | null;
}): Promise<ConfirmRobotDispatchResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, pacote, quantidade, instagram_user, valor, custo_real")
    .eq("id", input.pedidoId)
    .maybeSingle();
  if (error || !pedido) return { ok: false, error: "PEDIDO_NAO_ENCONTRADO" };
  if (pedido.status === "Enviado") return { ok: true, fornecedor: input.fornecedor ?? null, orderId: input.providerOrderId ?? null, custoBrl: Number(pedido.custo_real ?? 0) || null };
  if (pedido.status !== "waiting_provision" && pedido.status !== "MARGIN_HOLD" && pedido.status !== "SMM_FAILED") {
    return { ok: false, error: `STATUS_${pedido.status}` };
  }

  let fornecedor = input.fornecedor ?? null;
  let custoBrl = typeof input.valorPagoBrl === "number" && Number.isFinite(input.valorPagoBrl) && input.valorPagoBrl >= 0
    ? input.valorPagoBrl
    : Number(pedido.custo_real ?? 0) || null;

  if (custoBrl == null || !fornecedor) {
    try {
      const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
      const ranked = await rankProvidersByCost({ pacote: pedido.pacote, quantidade: Number(pedido.quantidade) });
      const top = ranked.find((p) => p.cost_brl != null) ?? ranked[0] ?? null;
      fornecedor = fornecedor ?? top?.slug ?? top?.nome ?? null;
      custoBrl = custoBrl ?? top?.cost_brl ?? null;
    } catch (e) {
      console.warn("[robot-confirm] rank cost fail", e);
    }
  }

  const orderId = input.providerOrderId ?? null;
  const updates: {
    status: string;
    error_detail: string;
    custo_real?: number;
  } = {
    status: "Enviado",
    error_detail: `Robô externo confirmou envio${fornecedor ? ` via ${fornecedor}` : ""}${orderId ? ` (order ${orderId})` : ""}`,
  };
  if (custoBrl != null) updates.custo_real = Number(custoBrl.toFixed(4));

  const { error: updErr } = await supabaseAdmin
    .from("pedidos")
    .update(updates)
    .eq("id", pedido.id)
    .in("status", ["waiting_provision", "MARGIN_HOLD", "SMM_FAILED", "Enviado"]);
  if (updErr) return { ok: false, error: "UPDATE_FAILED" };

  if (custoBrl != null && custoBrl > 0) {
    try {
      await supabaseAdmin.rpc("wallet_credit" as any, { _wallet_key: "reservado", _amount: -Number(custoBrl.toFixed(4)) });
      await supabaseAdmin.from("financial_ledger" as any).insert({
        valor_brl: Number(custoBrl.toFixed(4)),
        origem: "wallet:reservado",
        destino: fornecedor ? `fornecedor:${fornecedor}` : "fornecedor:externo",
        pedido_id: String(pedido.id),
        fornecedor_slug: fornecedor,
        telemetry: { event: "ROBOT_DISPATCH_CONFIRMED", provider_order_id: orderId, cost_brl: custoBrl, ts: new Date().toISOString() },
      } as any);
    } catch (e) {
      console.warn("[robot-confirm] reserved debit fail", e);
      await supabaseAdmin
        .from("pedidos")
        .update({ status: "waiting_provision", error_detail: "Falha ao debitar saldo reservado; confirmação do robô revertida." })
        .eq("id", pedido.id);
      return { ok: false, error: "RESERVED_DEBIT_FAILED" };
    }
  }

  try {
    const fat = Number(pedido.valor) || 0;
    const custo = Number(custoBrl ?? 0);
    const taxaPix = Number((fat * 0.0099).toFixed(2));
    const lucroLiq = Number((fat - custo - taxaPix).toFixed(2));
    const netPct = fat > 0 ? Number(((lucroLiq / fat) * 100).toFixed(2)) : 0;
    await supabaseAdmin.from("admin_treasury" as any).upsert({
      pedido_id: pedido.id,
      faturamento: fat,
      custo_api: custo,
      taxa_pix: taxaPix,
      lucro_liquido: lucroLiq,
      network: String(pedido.pacote ?? "").split("_")[0] ?? null,
      occurred_at: new Date().toISOString(),
      supplier_cost: custoBrl != null ? Number(custoBrl.toFixed(4)) : null,
      provider_selected: fornecedor,
      net_profit_percentage: netPct,
    } as any, { onConflict: "pedido_id" });
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "robot@external",
      action: "ROBOT_DISPATCH_CONFIRMED",
      detail: { pedido_id: pedido.id, provider: fornecedor, order_id: orderId, cost_brl: custoBrl, ts: new Date().toISOString() },
    } as any);
  } catch (e) { console.warn("[robot-confirm] treasury/audit fail", e); }

  return { ok: true, fornecedor, orderId, custoBrl };
}

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
