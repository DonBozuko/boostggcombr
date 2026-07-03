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

  // v173 — paridade com mp-webhook: credita Carteira Geral + ledger imutável.
  try {
    await supabaseAdmin.rpc("wallet_credit" as any, { _wallet_key: "geral", _amount: Number(pedido.valor) });
    await supabaseAdmin.from("financial_ledger" as any).insert({
      valor_brl: Number(pedido.valor),
      origem: "mercado_pago",
      destino: "wallet:geral",
      pedido_id: pedido.id,
      telemetry: { payment_id: String(pedido.mercado_pago_id), pacote: pedido.pacote, quantidade: pedido.quantidade, event: "PIX_APPROVED", source: "contingency" },
    } as any);
  } catch (e) { console.warn("[contingency] v173 credit geral fail", e); }



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

  // v164 — contingência também só enfileira; não despacha direto ao fornecedor.
  try {
    const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
    const ranked = await rankProvidersByCost({ pacote: pedido.pacote, quantidade: Number(pedido.quantidade) });
    const top = ranked.find((p) => p.cost_brl != null) ?? ranked[0] ?? null;
    const custoEstim = top?.cost_brl ?? null;
    await supabaseAdmin
      .from("pedidos")
      .update({
        status: "waiting_provision",
        error_detail: `Contingência: Aguardando Automação/Saldo${top?.slug ? ` · fornecedor sugerido: ${top.slug}` : ""}`,
        ...(custoEstim != null ? { custo_real: Number(custoEstim.toFixed(4)) } : {}),
      })
      .eq("id", pedido.id);
    if (custoEstim != null && custoEstim > 0) {
      await supabaseAdmin.rpc("wallet_credit" as any, { _wallet_key: "reservado", _amount: Number(custoEstim.toFixed(4)) });
      await supabaseAdmin.from("financial_ledger" as any).insert({
        valor_brl: Number(custoEstim.toFixed(4)),
        origem: "wallet:geral",
        destino: "wallet:reservado",
        pedido_id: pedido.id,
        fornecedor_slug: top?.slug ?? null,
        telemetry: { event: "WAITING_AUTOMATION_BALANCE", source: "contingency", provider: top?.slug ?? null, cost_brl: custoEstim },
      } as any);
    }
    try {
      const { notifyAdminProvisioning } = await import("@/lib/whatsapp-admin.server");
      await notifyAdminProvisioning({
        pedidoId: String(pedido.id),
        vendaBrl: Number(pedido.valor),
        custoBrl: custoEstim,
        fornecedor: top?.slug ?? null,
        motivo: "Pagamento aprovado via contingência · aguardando robô externo",
      });
    } catch (e) { console.warn("[contingency] v164 queue notify fail", e); }
    return { ok: true, status: "waiting_provision", recovered: true, note: "queued for robot" };
  } catch (e) {
    console.warn("[contingency] v164 queue fail", e);
  }


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

  // v174 — obter cost_brl real por fornecedor para gravar custo_real + ledger
  const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
  const rankedContingency = await rankProvidersByCost({
    pacote: pedido.pacote,
    quantidade: Number(pedido.quantidade),
  }).catch(() => [] as Array<{ slug: string; cost_brl: number | null }>);
  const costMap = new Map<string, number | null>(
    rankedContingency.map((p) => [p.slug, p.cost_brl]),
  );
  const serviceIdMap = new Map<string, string | number | null>(
    rankedContingency.map((p: any) => [p.slug, p.provider_service_id ?? null]),
  );

  for (const f of cadeia) {
    const r = await dispatchByFornecedor(f.slug, {
      pacote: pedido.pacote,
      quantidade: pedido.quantidade,
      instagram_user: pedido.instagram_user,
      serviceIdOverride: f.slug === "smmhype" ? undefined : serviceIdMap.get(f.slug) ?? null,
    });
    if (r.ok) {
      sucesso = true;
      fornecedorOk = f.nome;
      orderIdOk = r.orderId ?? null;
      const custoReal = costMap.get(f.slug) ?? null;
      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "paid",
          error_detail: `Contingência OK · ${f.nome} (order ${r.orderId ?? "?"})`,
          ...(custoReal != null ? { custo_real: Number(custoReal.toFixed(4)) } : {}),
        })
        .eq("id", pedido.id);

      // v174 — ledger + treasury: fecha o buraco de auditoria do path legado
      try {
        const fat = Number(pedido.valor);
        const taxaPix = Number((fat * 0.0099 + 0.49).toFixed(2));
        const custo = custoReal != null ? Number(custoReal.toFixed(2)) : 0;
        const lucroLiq = Number((fat - custo - taxaPix).toFixed(2));
        const netPct = fat > 0 ? Number(((lucroLiq / fat) * 100).toFixed(2)) : 0;
        await supabaseAdmin.from("admin_treasury" as any).upsert(
          {
            pedido_id: pedido.id,
            faturamento: fat,
            custo_api: custo,
            taxa_pix: taxaPix,
            lucro_liquido: lucroLiq,
            network: String(pedido.pacote ?? "").split("_")[0] ?? null,
            occurred_at: new Date().toISOString(),
            supplier_cost: custoReal != null ? Number(custoReal.toFixed(4)) : null,
            provider_selected: f.slug,
            net_profit_percentage: netPct,
          } as any,
          { onConflict: "pedido_id" },
        );
        if (custo > 0) {
          await supabaseAdmin.from("financial_ledger" as any).insert({
            valor_brl: custo,
            origem: "wallet:geral",
            destino: `fornecedor:${f.slug}`,
            pedido_id: pedido.id,
            fornecedor_slug: f.slug,
            telemetry: { event: "DISPATCH_OK_CONTINGENCY", provider: f.slug, cost_brl: custo, order_id: r.orderId ?? null },
          } as any);
        }
      } catch (e) { console.warn("[contingency] v174 treasury/ledger fail", e); }
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
    // v180 — SLA 24h: se falha for saldo insuficiente em fornecedor, parqueia em waiting_provision.
    // Só refunda se, após 24h, ainda não houver saldo (executado pelo SLA watcher).
    const isSaldoInsuficiente = tentativas.some((t) =>
      /insufficient|saldo|balance|not enough|no funds/i.test(t),
    );

    if (isSaldoInsuficiente) {
      const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "waiting_provision",
          sla_deadline: deadline,
          error_detail: `Saldo insuficiente em fornecedores. Recarga até ${deadline}. ${tentativas.join(" | ")}`.slice(0, 500),
        } as any)
        .eq("id", pedido.id);

      try {
        const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
        await dispatchWhatsappAlert(
          `⏳ PEDIDO PARQUEADO (SLA 24h)\n\nPedido ${pedido.id.slice(0, 8)} · R$${Number(pedido.valor).toFixed(2)}\nPacote: ${pedido.pacote} × ${pedido.quantidade}\n\nRecarregue fornecedor até ${new Date(deadline).toLocaleString("pt-BR")} ou refund automático.\n\nTentativas:\n${tentativas.join("\n")}`,
        ).catch(() => {});
      } catch { /* */ }

      return { ok: true, status: "waiting_provision", recovered: false, note: `SLA 24h até ${deadline}` };
    }

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
