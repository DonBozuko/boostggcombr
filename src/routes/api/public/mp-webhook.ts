import { createFileRoute } from "@tanstack/react-router";

const MP_PAYMENTS_ENDPOINT = "https://api.mercadopago.com/v1/payments";

// v129 — Strict IP Rate Limiter (5 req/s por IP, in-memory sliding window)
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 1000;
const rateBuckets = new Map<string, number[]>();
function rateLimitCheck(ip: string): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) { rateBuckets.set(ip, arr); return false; }
  arr.push(now);
  rateBuckets.set(ip, arr);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) if (!v.length || now - v[v.length - 1] > 60000) rateBuckets.delete(k);
  }
  return true;
}

function scheduleWebhookBackground(job: Promise<unknown>, context?: unknown) {
  const safeJob = job.catch((err) => console.error("[mp-webhook] background erro", err));
  const ctxWaitUntil = (context as { waitUntil?: (promise: Promise<unknown>) => void } | undefined)?.waitUntil;
  const edgeWaitUntil = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil;
  const globalWaitUntil = (globalThis as { waitUntil?: (promise: Promise<unknown>) => void }).waitUntil;

  try {
    if (typeof ctxWaitUntil === "function") return ctxWaitUntil(safeJob);
    if (typeof edgeWaitUntil === "function") return edgeWaitUntil(safeJob);
    if (typeof globalWaitUntil === "function") return globalWaitUntil(safeJob);
  } catch (err) {
    console.warn("[mp-webhook] waitUntil indisponível, seguindo detached", err);
  }

  void safeJob;
}

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      // MP às vezes faz GET ping de verificação
      GET: async () => new Response("ok", { status: 200 }),

      POST: async ({ request, context }) => {
        const clientIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        if (!rateLimitCheck(clientIp)) {
          return new Response("Too Many Requests", { status: 429, headers: { "retry-after": "1", "cache-control": "no-store" } });
        }
        const requestUrl = request.url;
        let rawBody = "";
        try {
          rawBody = await request.text();
        } catch (err) {
          console.warn("[mp-webhook] body read falhou; respondendo 200 mesmo assim", err);
        }

        const backgroundJob = Promise.resolve().then(async () => {
          // Sempre 200 — MP reenvia se for !=2xx. Logamos erros e seguimos.
          try {
          const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
          if (!mpToken) {
            console.error("[mp-webhook] MERCADO_PAGO_ACCESS_TOKEN ausente");
            return;
          }

          // Extrai payment id (body JSON OU query string)
          const url = new URL(requestUrl);
          let paymentId =
            url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? null;
          let topic =
            url.searchParams.get("type") ?? url.searchParams.get("topic") ?? null;

          if (rawBody) {
            try {
              const body = JSON.parse(rawBody) as {
                type?: string;
                action?: string;
                data?: { id?: string | number };
              };
              topic = topic ?? body.type ?? body.action ?? null;
              if (body.data?.id != null) paymentId = String(body.data.id);
            } catch {
              /* corpo não-JSON, segue com query */
            }
          }

          if (!paymentId) {
            console.warn("[mp-webhook] sem payment id", { topic, rawBody });
            return;
          }

          // Só nos importam eventos de payment
          if (topic && !/payment/i.test(topic)) {
            return;
          }

          // 1) Busca o pagamento no MP para confirmar status
          const mpRes = await fetch(`${MP_PAYMENTS_ENDPOINT}/${paymentId}`, {
            headers: { Authorization: `Bearer ${mpToken}` },
          });
          if (!mpRes.ok) {
            console.error("[mp-webhook] MP fetch falhou", mpRes.status, paymentId);
            return;
          }
          const payment = (await mpRes.json()) as {
            status?: string;
            status_detail?: string;
            id?: string | number;
            transaction_amount?: number;
          };
          if (payment.status !== "approved") {
            console.warn("[mp-webhook] MP recusou", {
              paymentId, status: payment.status, status_detail: payment.status_detail,
            });
            // Audit: registra recusa no pedido se existir
            const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
            await admin
              .from("pedidos")
              .update({
                status: `mp_${payment.status ?? "unknown"}`,
                error_detail: `MP ${payment.status}: ${payment.status_detail ?? "sem detalhe"}`,
              })
              .eq("mercado_pago_id", String(paymentId));
            return;
          }

          // 2) Atualiza pedido para 'paid' (admin client p/ contornar RLS)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: pedido, error: selErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, status, pacote, quantidade, instagram_user, valor, cupom")
            .eq("mercado_pago_id", String(paymentId))
            .maybeSingle();

          if (selErr || !pedido) {
            console.error("[mp-webhook] pedido não encontrado", paymentId, selErr);
            return;
          }

          // SEGURANÇA: valor pago tem que bater com o valor do plano salvo (centavos)
          const expectedCents = Math.round(Number(pedido.valor) * 100);
          const paidCents = Math.round(Number(payment.transaction_amount ?? 0) * 100);
          if (expectedCents !== paidCents) {
            console.error("[mp-webhook] valor divergente — NÃO disparando SMM", {
              pedidoId: pedido.id, expected: pedido.valor, paid: payment.transaction_amount,
            });
            await supabaseAdmin
              .from("pedidos")
              .update({
                status: "amount_mismatch",
                error_detail: `Esperado R$${pedido.valor} · Recebido R$${payment.transaction_amount}`,
              })
              .eq("id", pedido.id);
            return;
          }

          // v94 — Strict Idempotency Gateway Guard (payment_id + treasury ledger)
          if (pedido.status === "paid") {
            console.log("[mp-webhook] v94 idempotency: pedido já paid", { paymentId, pedidoId: pedido.id });
            return;
          }
          {
            const { data: alreadyLedger } = await supabaseAdmin
              .from("admin_treasury" as any)
              .select("id")
              .eq("pedido_id", pedido.id)
              .maybeSingle();
            if (alreadyLedger) {
              console.log("[mp-webhook] v94 idempotency: ledger existente, abort", { paymentId, pedidoId: pedido.id });
              return;
            }
          }

          // v98 — Late-Payment Catch Engine: aprovação chegou após timeout de 3min do front.
          // NÃO descartamos: processamos assíncrono, aplicando Equação Fabiano + dispatch.
          // Se dispatch falhar em todos fornecedores, o fluxo v95 (linhas abaixo) estorna automaticamente.
          const LATE_STATES = new Set(["expired", "timeout", "cancelled_client", "abandoned", "pending"]);
          const isLatePayment = LATE_STATES.has(String(pedido.status ?? "").toLowerCase());
          if (isLatePayment) {
            try {
              await supabaseAdmin.from("admin_audit_logs" as any).insert({
                admin_email: "system@webhook",
                action: "LATE_PAYMENT_CATCH",
                detail: {
                  ts: new Date().toISOString(),
                  payment_id: String(paymentId),
                  pedido_id: pedido.id,
                  previous_status: pedido.status,
                  message: `[mp-webhook] v98 Late-Payment Catch · pagamento aprovado pós-timeout, processando assíncrono`,
                },
              } as any);
            } catch (e) { console.warn("[mp-webhook] v98 audit late catch fail", e); }
            console.warn("[mp-webhook] v98 late payment catch", { paymentId, pedidoId: pedido.id, previous: pedido.status });
          }

          // v116 — Pessimistic lock via conditional update: só passa 1 worker.
          const { data: lockRow, error: updErr } = await supabaseAdmin
            .from("pedidos")
            .update({ status: "paid", error_detail: isLatePayment ? "v98 late-payment catch: processado pós-timeout" : null })
            .eq("id", pedido.id)
            .neq("status", "paid")
            .select("id")
            .maybeSingle();
          if (updErr) {
            console.error("[mp-webhook] update falhou", updErr);
            return;
          }
          if (!lockRow) {
            console.log("[mp-webhook] v116 lock: outro worker já processou", { pedidoId: pedido.id });
            return;
          }

          // v116 — Banco Interno Virtual: credita Carteira Geral + registra ledger imutável.
          try {
            await supabaseAdmin.rpc("wallet_credit" as any, { _wallet_key: "geral", _amount: Number(pedido.valor) });
            await supabaseAdmin.from("financial_ledger" as any).insert({
              valor_brl: Number(pedido.valor),
              origem: "mercado_pago",
              destino: "wallet:geral",
              pedido_id: pedido.id,
              buyer_ip: request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip") ?? null,
              telemetry: { payment_id: String(paymentId), pacote: pedido.pacote, quantidade: pedido.quantidade, event: "PIX_APPROVED" },
            } as any);
          } catch (e) { console.warn("[mp-webhook] v116 ledger PIX_APPROVED fail", e); }

          // 3) Smart Cost Routing v58-B: ranqueia por menor custo BRL real, com sentinela de saúde.
          const baseQty = Number(pedido.quantidade);
          const mysteryBonus = 0;
          const qtyEnvio = baseQty;
          const { rankProvidersByCost, markProviderUnstable, clearProviderUnstable } = await import("@/lib/smart-routing.server");
          const cadeia = await rankProvidersByCost({ pacote: pedido.pacote, quantidade: qtyEnvio });

          if (!cadeia.length) {
            // v116 — sem fornecedor disponível: entra em fila, NÃO estorna, NÃO cancela.
            await supabaseAdmin
              .from("pedidos")
              .update({ status: "waiting_provision", error_detail: "v116 fila: aguardando provisão de fornecedor (nenhum ATIVO com saldo/ID)" })
              .eq("id", pedido.id);
            try {
              await supabaseAdmin.from("financial_ledger" as any).insert({
                valor_brl: Number(pedido.valor), origem: "wallet:geral", destino: "wallet:reservado", pedido_id: pedido.id,
                telemetry: { event: "WAITING_PROVISION", reason: "no_provider" },
              } as any);
              await supabaseAdmin.rpc("wallet_credit" as any, { _wallet_key: "reservado", _amount: Number(pedido.valor) });
            } catch (e) { console.warn("[mp-webhook] v116 waiting_provision ledger fail", e); }
            try {
              const { notifyAdminProvisioning } = await import("@/lib/whatsapp-admin.server");
              await notifyAdminProvisioning({
                pedidoId: String(pedido.id),
                vendaBrl: Number(pedido.valor),
                motivo: "Nenhum fornecedor ATIVO com saldo/ID mapeado",
              });
            } catch (e) { console.warn("[mp-webhook] v119 whatsapp bridge fail", e); }
            return;
          }

          console.log("[mp-webhook] smart-routing rank", {
            pedidoId: pedido.id,
            ordem: cadeia.map((p) => ({ slug: p.slug, cost: p.cost_brl, unstable: p.unstable })),
          });

          const { dispatchByFornecedor } = await import("@/lib/dispatcher-fallback.server");
          const { respectsMinMargin } = await import("@/lib/margin-guardian");
          const tentativas: string[] = [];
          let sucesso = false;
          let margemBloqueada = 0;

          for (const f of cadeia) {
            // v110 — Failover Injector Gateway: registra desvio quando não é o preferencial (smmhype)
            // ou quando já houve tentativa anterior nesta ordem.
            if (f.slug !== "smmhype" || tentativas.length > 0) {
              try {
                await supabaseAdmin.from("admin_audit_logs" as any).insert({
                  admin_email: "system@webhook",
                  action: "FAILOVER_ACTIVE",
                  detail: {
                    ts: new Date().toISOString(),
                    pedido_id: pedido.id,
                    provider: f.slug,
                    provider_nome: f.nome,
                    provider_service_id: f.provider_service_id,
                    unstable: f.unstable,
                    tentativas_anteriores: tentativas,
                    message: `🟢 [mp-webhook] Failover Ativo ➔ Desviando Ordem para Fornecedor Reserva ${f.nome} via ID ${f.provider_service_id ?? f.service_id ?? "?"}`,
                  },
                });
              } catch (e) { console.warn("[mp-webhook] audit failover fail", e); }
            }
            // v84 — saldo BRL insuficiente
            if (f.cost_brl != null && Number(f.saldo_atual) < f.cost_brl) {
              const det = `Saldo insuficiente: R$ ${Number(f.saldo_atual).toFixed(2)} < custo R$ ${f.cost_brl.toFixed(2)}`;
              tentativas.push(`${f.nome}: ${det}`);
              console.warn("[mp-webhook] v84 skip saldo zerado", { pedidoId: pedido.id, fornecedor: f.slug, saldo: f.saldo_atual, custo: f.cost_brl });
              await markProviderUnstable(f.slug, det);
              continue;
            }
            // v91 — Strict Margin Guardian: pula fornecedor se custo violar 300% de lucro líquido
            if (f.cost_brl != null && !respectsMinMargin(Number(pedido.valor), f.cost_brl)) {
              const det = `Margem <300%: venda R$ ${Number(pedido.valor).toFixed(2)} vs custo R$ ${f.cost_brl.toFixed(2)}`;
              tentativas.push(`${f.nome}: ${det}`);
              margemBloqueada++;
              console.warn("[mp-webhook] v91 skip margem", { pedidoId: pedido.id, fornecedor: f.slug, custo: f.cost_brl, venda: pedido.valor });
              continue;
            }
            const r = await dispatchByFornecedor(f.slug, {
              pacote: pedido.pacote,
              quantidade: qtyEnvio,
              instagram_user: pedido.instagram_user,
              serviceIdOverride: f.provider_service_id ?? null,
            });
            if (r.ok) {
              await clearProviderUnstable(f.slug);
              console.log("[mp-webhook] dispatch OK", { pedidoId: pedido.id, fornecedor: f.slug, orderId: r.orderId, cost_brl: f.cost_brl });

              // ===== Custo real: pré-computado pelo smart-routing (rate × cotacao_brl × qty/1000) =====
              const custoReal: number | null = f.cost_brl;

              await supabaseAdmin
                .from("pedidos")
                .update({
                  status: "paid",
                  error_detail: `${mysteryBonus > 0 ? `MB:${mysteryBonus} · ` : ""}Enviado via ${f.nome} (order ${r.orderId ?? "?"})`,
                  ...(custoReal != null ? { custo_real: Number(custoReal.toFixed(4)) } : {}),
                })
                .eq("id", pedido.id);

              // ===== Tesouraria: registra ledger idempotente =====
              try {
                const fat = Number(pedido.valor);
                const taxaPix = Number((fat * 0.0099).toFixed(2)); // MP Pix ~0,99%
                const custo = custoReal != null ? Number(custoReal.toFixed(2)) : 0;
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
                  supplier_cost: custoReal != null ? Number(custoReal.toFixed(4)) : null,
                  provider_selected: f.slug,
                  net_profit_percentage: netPct,
                } as any, { onConflict: "pedido_id" });
              } catch (e) { console.warn("[mp-webhook] treasury ledger falhou", e); }
              // v94 — Telemetria de auditoria: dispatch OK
              try {
                await supabaseAdmin.from("admin_audit_logs" as any).insert({
                  admin_email: "system@webhook",
                  action: "DISPATCH_OK",
                  detail: {
                    ts: new Date().toISOString(),
                    payment_id: String(paymentId),
                    pedido_id: pedido.id,
                    pacote: pedido.pacote,
                    quantidade: pedido.quantidade,
                    cost_brl: custoReal,
                    provider: f.slug,
                    order_id: r.orderId ?? null,
                    message: `[mp-webhook] dispatch OK`,
                  },
                } as any);
              } catch (e) { console.warn("[mp-webhook] audit dispatch_ok fail", e); }
              // === Notificação Telegram: sucesso / auto-reparo ===
              try {
                const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
                const lucro = custoReal != null ? (Number(pedido.valor) - custoReal) : null;
                const isFailover = tentativas.length > 0;
                const header = isFailover
                  ? "🚨 AUTO-REPARO ATIVADO: Pedido migrado e resolvido com sucesso no Fornecedor de Backup"
                  : "🟢 OK · Venda confirmada e despachada";
                const msg = [
                  header,
                  `🧾 Pedido: ${pedido.id}`,
                  `👤 ${pedido.instagram_user} · ${pedido.pacote} (${pedido.quantidade})`,
                  `💰 Venda: R$ ${Number(pedido.valor).toFixed(2)}`,
                  custoReal != null ? `📦 Custo real: R$ ${custoReal.toFixed(2)}` : null,
                  lucro != null ? `💎 Lucro: R$ ${lucro.toFixed(2)}` : null,
                  `🏷️ Fornecedor: ${f.nome} (order ${r.orderId ?? "?"})`,
                  isFailover ? `↩️ Tentativas anteriores: ${tentativas.join(" | ").slice(0, 300)}` : null,
                ].filter(Boolean).join("\n");
                await dispatchWhatsappAlert(msg);
              } catch (e) { console.error("[mp-webhook] tg success notify", e); }
              sucesso = true;
              break;
            }
            const det = `${r.error}${r.status ? ` HTTP ${r.status}` : ""}`;
            tentativas.push(`${f.nome}: ${det}`);
            await markProviderUnstable(f.slug, det);
            console.warn("[mp-webhook] fallback (marcado _unstable 30min)", { pedidoId: pedido.id, fornecedor: f.slug, ...r });
          }

          if (!sucesso) {
            const falhaResumo = tentativas.join(" | ").slice(0, 400);
            // v91 — se TODOS falharam por margem, retém em modo de segurança e gera Alerta Vermelho
            if (margemBloqueada > 0 && margemBloqueada === cadeia.length) {
              console.error("[mp-webhook] v91 HOLD margem", { pedidoId: pedido.id, tentativas });
              await supabaseAdmin
                .from("pedidos")
                .update({ status: "MARGIN_HOLD", error_detail: `Retido por margem <300% em todos fornecedores. ${falhaResumo}`.slice(0, 500) })
                .eq("id", pedido.id);
              await supabaseAdmin.from("admin_audit_logs" as any).insert({
                admin_email: "system@webhook",
                action: "MARGIN_HOLD_ERROR",
                detail: {
                  ts: new Date().toISOString(),
                  payment_id: String(paymentId),
                  pedido_id: pedido.id,
                  pacote: pedido.pacote,
                  quantidade: pedido.quantidade,
                  venda_brl: Number(pedido.valor),
                  tentativas: falhaResumo,
                  message: `[mp-webhook] MARGIN_HOLD ERROR · nenhum fornecedor respeita 300%`,
                },
              } as any).then(() => {}, (e) => console.warn("[mp-webhook] audit insert fail", e));
              const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
              await dispatchWhatsappAlert(`🚨 MARGIN GUARDIAN · Pedido ${pedido.id} em HOLD. Custos violam 300%. Ajuste preço ou fornecedor.`).catch(() => {});
              return;
            }
            // v116 — todos fornecedores falharam por saldo/instabilidade (não é margem):
            // NÃO estorna, NÃO cancela. Enfileira em waiting_provision. Operador provisiona depois.
            console.warn("[mp-webhook] v116 waiting_provision · sem provisão dispatch", { pedidoId: pedido.id, tentativas });
            await supabaseAdmin
              .from("pedidos")
              .update({
                status: "waiting_provision",
                error_detail: `v116 fila: aguardando provisão. ${falhaResumo}`.slice(0, 500),
              })
              .eq("id", pedido.id);
            try {
              await supabaseAdmin.rpc("wallet_credit" as any, { _wallet_key: "reservado", _amount: Number(pedido.valor) });
              await supabaseAdmin.from("financial_ledger" as any).insert({
                valor_brl: Number(pedido.valor), origem: "wallet:geral", destino: "wallet:reservado", pedido_id: pedido.id,
                telemetry: { event: "WAITING_PROVISION", reason: "all_providers_failed", tentativas: falhaResumo },
              } as any);
              await supabaseAdmin.from("admin_audit_logs" as any).insert({
                admin_email: "system@webhook",
                action: "WAITING_PROVISION",
                detail: {
                  ts: new Date().toISOString(), payment_id: String(paymentId), pedido_id: pedido.id,
                  valor_brl: Number(pedido.valor), tentativas: falhaResumo,
                  message: "[mp-webhook] v116 · pedido enfileirado, sem estorno",
                },
              } as any);
            } catch (e) { console.warn("[mp-webhook] v116 audit waiting fail", e); }

            const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
            await dispatchWhatsappAlert(`🟡 v116 Pedido ${pedido.id} em fila (waiting_provision). Sem fornecedor com saldo. Provisionar SMMHype/SMMPanel/Verified.`).catch(() => {});
            try {
              const custoEstim = cadeia.find((p) => p.cost_brl != null)?.cost_brl ?? null;
              const fornecedorAlvo = cadeia[0]?.slug ?? null;
              const { notifyAdminProvisioning } = await import("@/lib/whatsapp-admin.server");
              await notifyAdminProvisioning({
                pedidoId: String(pedido.id),
                vendaBrl: Number(pedido.valor),
                custoBrl: custoEstim,
                fornecedor: fornecedorAlvo,
                motivo: `Todos fornecedores falharam: ${falhaResumo}`.slice(0, 200),
              });
            } catch (e) { console.warn("[mp-webhook] v119 whatsapp bridge fail", e); }
          }

        } catch (err) {
          console.error("[mp-webhook] erro inesperado", err);
        }
        });

        scheduleWebhookBackground(backgroundJob, context);
        return Response.json({ received: true }, {
          status: 200,
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
