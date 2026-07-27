// Server-only: contingency confirmation + auto-dispatch when the MP webhook fails.
// Called by the client polling fallback (getPedidoStatus) to break the
// "Aguardando pagamento..." infinite loop when handshakes are lost.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchByFornecedor, refundMercadoPago } from "./dispatcher-fallback.server";
import type { RankedProvider } from "./smart-routing.server";

const MP_PAYMENTS_ENDPOINT = "https://api.mercadopago.com/v1/payments";

export type ContingencyResult =
  | { ok: true; status: string; recovered: boolean; note?: string }
  | { ok: false; status: string | null; error: string };

export async function confirmAndDispatchIfPaid(pedidoId: string): Promise<ContingencyResult> {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, pacote, quantidade, instagram_user, valor, mercado_pago_id, email_contato, reseller_id, reseller_valor")
    .eq("id", pedidoId)
    .maybeSingle();
  if (error || !pedido) return { ok: false, status: null, error: "PEDIDO_NOT_FOUND" };

  // Already advanced — nothing to do.
  const recoverableStatuses = ["pending", "mp_pending", "mp_in_process"];
  if (!recoverableStatuses.includes(String(pedido.status))) {
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
      signal: AbortSignal.timeout(10_000),
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
      .in("status", recoverableStatuses);
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
    .in("status", recoverableStatuses)
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

  // v187 — removido early-return v164 que travava todo pedido em waiting_provision.
  // Dispatch A→B→C abaixo já cobre: sucesso → paid; sem saldo → waiting_provision c/ SLA 24h;
  // todos falham → refund. Robô externo não é mais requisito pra entrega automática.



  // v174/v245 — obter cost_brl real por fornecedor e garantir que a trava BR respeitada
  const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
  const rankedContingency = await rankProvidersByCost({
    pacote: pedido.pacote,
    quantidade: Number(pedido.quantidade),
  }).catch(() => [] as RankedProvider[]);

  // 4) Dispatch failover: usa a cadeia ranqueada pelo smart-routing (v245).
  // Isso garante que a trava BR e a escolha por garantia/refill sejam respeitadas.
  const cadeia = (rankedContingency ?? []).map((p) => ({
    slug: p.slug,
    nome: p.nome,
    ativo: true,
    saldo_atual: p.saldo_atual,
  }));
  if (!cadeia.length) {
    await supabaseAdmin
      .from("pedidos")
      .update({ status: "SMM_FAILED", error_detail: "Contingência: nenhum fornecedor válido p/ este pacote (trava BR ou sem saldo)." })
      .eq("id", pedido.id);
    // v245 — alerta admin imediato quando trava BR bloqueia venda
    try {
      const { dispatchTelegramAlert } = await import("@/lib/messaging");
      await dispatchTelegramAlert(
        `🚨 <b>VENDA BLOQUEADA — TRAVA BR</b>\n\nPROBLEMA: pacote ${pedido.pacote} não tem fornecedor BR com refill válido.\n\nPedido <code>${pedido.id}</code> · R$${Number(pedido.valor).toFixed(2)}\nO QUE FAZER: cadastrar serviço BR com refill no catálogo ou suspender este pacote.`,
      );
    } catch { /* */ }
    return { ok: true, status: "SMM_FAILED", recovered: false };
  }

  const tentativas: string[] = [];
  let sucesso = false;
  let fornecedorOk: string | null = null;
  let orderIdOk: string | number | null = null;

  const costMap = new Map<string, number | null>(
    rankedContingency.map((p) => [p.slug, p.cost_brl]),
  );
  const serviceIdMap = new Map<string, string | number | null>(
    rankedContingency.map((p: any) => [p.slug, p.provider_service_id ?? null]),
  );

  const { respectsMinMargin } = await import("@/lib/margin-guardian");
  for (const f of cadeia) {
    // v216 — trava anti-prejuízo: se custo do fallback quebra margem mínima,
    // pula e vai pro próximo. Sem isso, SMMPainel (11x mais caro que SMMHype)
    // consumia todo o lucro do pedido.
    const custoFornecedor = costMap.get(f.slug) ?? null;
    if (custoFornecedor != null && !respectsMinMargin(Number(pedido.valor), custoFornecedor)) {
      tentativas.push(`${f.nome}: bloqueado (custo R$${custoFornecedor.toFixed(2)} > margem mínima)`);
      continue;
    }
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
          status: "processing",
          error_detail: `Contingência OK · ${f.nome} (order ${r.orderId ?? "?"})`,
          ...(custoReal != null ? { custo_real: Number(custoReal.toFixed(4)) } : {}),
          provider_slug: f.slug,
          provider_order_id: r.orderId != null ? String(r.orderId) : null,
          dispatched_at: new Date().toISOString(),
          last_reconciled_at: new Date().toISOString(),
        } as any)
        .eq("id", pedido.id)
        .is("provider_order_id", null);

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
    // v218 — Circuit breaker: falha estrutural (rede/5xx/timeout) trip do fornecedor.
    // Erros de negócio (saldo, service id, 4xx) NÃO trip — não são culpa do fornecedor.
    try {
      const errStr = String(r.error ?? "");
      const structural = /timeout|rede|ECONN|ETIMEDOUT|fetch failed|HTTP 5\d\d/i.test(errStr)
        || (typeof r.status === "number" && r.status >= 500);
      if (structural) {
        const { markProviderUnstable } = await import("@/lib/smart-routing.server");
        await markProviderUnstable(f.slug, `verificações automáticas seguidas: ${errStr}`);
      }
    } catch { /* noop */ }
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
    // v180/v296 — parqueia em vez de estornar quando a falha não é definitiva.
    const { classifyDispatchFailure, TRANSIENT_SLA_MS, BALANCE_SLA_MS } = await import("./failure-classifier");
    const kind = classifyDispatchFailure(tentativas);

    if (kind === "balance" || kind === "transient") {
      const isSaldo = kind === "balance";
      // v296 — TRAVA DE PRAZO ETERNO. O SLA watcher retenta virando o pedido
      // pra "pending" e chamando esta função de novo. Se recalculássemos o
      // prazo aqui, cada retentativa empurraria o vencimento pra frente e o
      // pedido NUNCA seria entregue nem estornado. O primeiro prazo manda.
      const { data: atual } = await supabaseAdmin
        .from("pedidos")
        .select("sla_deadline")
        .eq("id", pedido.id)
        .maybeSingle();
      const prazoExistente = (atual as any)?.sla_deadline as string | null | undefined;
      const deadline = prazoExistente
        ? new Date(prazoExistente).toISOString()
        : new Date(Date.now() + (isSaldo ? BALANCE_SLA_MS : TRANSIENT_SLA_MS)).toISOString();
      const prazoTxt = new Date(deadline).toLocaleString("pt-BR");

      await supabaseAdmin
        .from("pedidos")
        .update({
          status: "waiting_provision",
          sla_deadline: deadline,
          error_detail: (isSaldo
            ? `Saldo insuficiente em fornecedores. Recarga até ${deadline}. `
            : `v296: falha temporária no fornecedor. Retentando até ${deadline}. `) + tentativas.join(" | "),
        } as any)
        .eq("id", pedido.id);

      // v296 — alerta só no PRIMEIRO parqueamento. Sem isso, cada retentativa
      // do SLA watcher (15 em 15min) mandaria o mesmo aviso e viraria ruído.
      try {
        if (prazoExistente) throw new Error("skip-alert");
        const { dispatchTelegramAlert } = await import("@/lib/messaging");

        const msg = isSaldo
          ? `⏳ <b>PEDIDO EM ESPERA — RECARREGAR EM 24h</b>\n\nPROBLEMA: cliente pagou mas nenhum fornecedor tinha saldo pra entregar.\n\nPedido <code>${pedido.id}</code> · R$${Number(pedido.valor).toFixed(2)}\nPacote: ${pedido.pacote} × ${pedido.quantidade}\n\nO QUE FAZER: recarregar qualquer fornecedor até ${prazoTxt} e apertar "Recarga Confirmada". Se passar do prazo, cliente é reembolsado automático.\n\nTentativas:\n${tentativas.join("\n")}`
          : `⏳ <b>PEDIDO EM ESPERA — FORNECEDOR RECUSOU AGORA</b>\n\nPROBLEMA: cliente pagou e os fornecedores recusaram o envio neste momento. O sistema vai tentar de novo sozinho a cada 15 minutos.\n\nPedido <code>${pedido.id}</code> · R$${Number(pedido.valor).toFixed(2)}\nPacote: ${pedido.pacote} × ${pedido.quantidade}\n\nO QUE FAZER: nada agora. Se não entrar até ${prazoTxt}, o cliente é reembolsado automático e você é avisado.\n\nRecusas:\n${tentativas.join("\n")}`;
        await dispatchTelegramAlert(msg, {
          inlineKeyboard: [[{ text: "✅ Recarga Confirmada", callback_data: `recharge:${pedido.id}` }]],
        }).catch(() => {});
      } catch { /* */ }

      return { ok: true, status: "waiting_provision", recovered: false, note: `SLA até ${deadline}` };
    }


    // v279 — estorno correto por origem do pagamento: revenda volta pra carteira,
    // varejo volta pro Mercado Pago. Antes, revenda caía em refundMercadoPago("null").
    const { refundPedido } = await import("@/lib/reseller-refund.server");
    const refund = await refundPedido(pedido as any, "contingência falhou em todos fornecedores");
    const refundedStatus = refund.kind === "reseller" ? "refunded" : "mp_refunded";
    await supabaseAdmin
      .from("pedidos")
      .update({
        status: refund.ok ? refundedStatus : "SMM_FAILED",
        error_detail: `Contingência falhou em todos fornecedores. Estorno(${refund.kind}) ${refund.ok ? "OK" : "FALHOU"}: ${refund.detail}. ${tentativas.join(" | ")}`.slice(0, 500),
      })
      .eq("id", pedido.id);

    // v273 — cliente é avisado por e-mail do estorno automático.
    // v279 — revenda recebe saldo de volta na carteira; não dispara e-mail de estorno bancário.
    if (refund.ok && refund.kind === "mp") {
      try {
        const { sendRefundNoticeEmail } = await import("@/lib/refund-email.server");
        await sendRefundNoticeEmail({
          id: String(pedido.id),
          email_contato: (pedido as any).email_contato,
          pacote: pedido.pacote,
          valor: pedido.valor,
        });
      } catch { /* nunca bloquear o estorno por causa de e-mail */ }
    }

    return { ok: true, status: refund.ok ? refundedStatus : "SMM_FAILED", recovered: false };

  }


  return { ok: true, status: "paid", recovered: true, note: `via ${fornecedorOk}` };
}

// v179 Etapa 3 — Redispatch órfão: pedido paid sem provider_order_id.
// Usado pelo Reconciliador Universal. Só age se pedido continua paid + órfão.
export type OrphanRedispatchResult =
  | { ok: true; fornecedor: string; orderId: string | null }
  | { ok: false; error: string; tentativas: string[] };

export async function redispatchPaidOrphan(pedidoId: string): Promise<OrphanRedispatchResult> {
  const { data: pedido } = await supabaseAdmin
    .from("pedidos")
    .select("id, status, pacote, quantidade, instagram_user, valor, provider_order_id, mercado_pago_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return { ok: false, error: "PEDIDO_NAO_ENCONTRADO", tentativas: [] };
  if (pedido.status !== "paid") return { ok: false, error: `STATUS_${pedido.status}`, tentativas: [] };
  if ((pedido as any).provider_order_id) return { ok: false, error: "JA_DESPACHADO", tentativas: [] };

  const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
  const { respectsMinMargin } = await import("@/lib/margin-guardian");
  const ranked = await rankProvidersByCost({
    pacote: pedido.pacote,
    quantidade: Number(pedido.quantidade),
  }).catch(() => [] as any[]);

  // v278 — reivindica o envio antes de qualquer chamada ao fornecedor.
  const { claimDispatch, releaseDispatch } = await import("@/lib/dispatch-claim.server");
  if (!(await claimDispatch(supabaseAdmin as any, pedido.id))) {
    return { ok: false, error: "ENVIO_EM_ANDAMENTO", tentativas: [] };
  }

  const tentativas: string[] = [];
  for (const f of ranked as any[]) {

    if (f.unstable) { tentativas.push(`${f.slug}: instável`); continue; }
    if (Number(f.saldo_atual) <= 0) { tentativas.push(`${f.slug}: saldo zero`); continue; }
    if (f.cost_brl != null && Number(f.saldo_atual) < f.cost_brl) { tentativas.push(`${f.slug}: saldo<custo`); continue; }
    if (f.cost_brl != null && !respectsMinMargin(Number(pedido.valor), f.cost_brl)) {
      tentativas.push(`${f.slug}: margem<300%`); continue;
    }
    const r = await dispatchByFornecedor(f.slug, {
      pacote: pedido.pacote,
      quantidade: Number(pedido.quantidade),
      instagram_user: pedido.instagram_user,
      serviceIdOverride: f.provider_service_id ?? null,
    });
    if (r.ok) {
      // Idempotency: só grava se ainda for órfão. Se outro processo despachou paralelo, aborta.
      const { data: gravado } = await supabaseAdmin
        .from("pedidos")
        .update({
          status: "processing",
          provider_slug: f.slug,
          provider_order_id: r.orderId != null ? String(r.orderId) : null,
          dispatched_at: new Date().toISOString(),
          last_reconciled_at: new Date().toISOString(),
          error_detail: `Reconciliador redispatch OK · ${f.nome ?? f.slug} (order ${r.orderId ?? "?"})`,
          ...(f.cost_brl != null ? { custo_real: Number(f.cost_brl.toFixed(4)) } : {}),
        } as any)
        .eq("id", pedido.id)
        .is("provider_order_id", null)
        .select("id")
        .maybeSingle();
      if (!gravado) {
        // Corrida perdida: outro caminho já despachou. Não é erro.
        return { ok: false, error: "CORRIDA_JA_DESPACHOU", tentativas };
      }
      return { ok: true, fornecedor: f.slug, orderId: r.orderId != null ? String(r.orderId) : null };
    }
    tentativas.push(`${f.slug}: ${r.error ?? "falha"}`);
    // v218 — Circuit breaker no redispatch órfão: mesma regra do fallback.
    try {
      const errStr = String(r.error ?? "");
      const structural = /timeout|rede|ECONN|ETIMEDOUT|fetch failed|HTTP 5\d\d/i.test(errStr);
      if (structural) {
        const { markProviderUnstable } = await import("@/lib/smart-routing.server");
        await markProviderUnstable(f.slug, `verificações automáticas seguidas: ${errStr}`);
      }
    } catch { /* noop */ }
  }
  await releaseDispatch(supabaseAdmin as any, pedido.id);
  return { ok: false, error: "TODOS_FORNECEDORES_FALHARAM", tentativas };
}


