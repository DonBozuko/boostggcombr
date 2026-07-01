import { createFileRoute } from "@tanstack/react-router";

const MP_PAYMENTS_ENDPOINT = "https://api.mercadopago.com/v1/payments";

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      // MP às vezes faz GET ping de verificação
      GET: async () => new Response("ok", { status: 200 }),

      POST: async ({ request }) => {
        // Sempre 200 — MP reenvia se for !=2xx. Logamos erros e seguimos.
        try {
          const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
          if (!mpToken) {
            console.error("[mp-webhook] MERCADO_PAGO_ACCESS_TOKEN ausente");
            return new Response("ok", { status: 200 });
          }

          // Extrai payment id (body JSON OU query string)
          const url = new URL(request.url);
          let paymentId =
            url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? null;
          let topic =
            url.searchParams.get("type") ?? url.searchParams.get("topic") ?? null;

          const rawBody = await request.text();
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
            return new Response("ok", { status: 200 });
          }

          // Só nos importam eventos de payment
          if (topic && !/payment/i.test(topic)) {
            return new Response("ok", { status: 200 });
          }

          // 1) Busca o pagamento no MP para confirmar status
          const mpRes = await fetch(`${MP_PAYMENTS_ENDPOINT}/${paymentId}`, {
            headers: { Authorization: `Bearer ${mpToken}` },
          });
          if (!mpRes.ok) {
            console.error("[mp-webhook] MP fetch falhou", mpRes.status, paymentId);
            return new Response("ok", { status: 200 });
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
            return new Response("ok", { status: 200 });
          }

          // 2) Atualiza pedido para 'paid' (admin client p/ contornar RLS)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: pedido, error: selErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, status, pacote, quantidade, instagram_user, valor")
            .eq("mercado_pago_id", String(paymentId))
            .maybeSingle();

          if (selErr || !pedido) {
            console.error("[mp-webhook] pedido não encontrado", paymentId, selErr);
            return new Response("ok", { status: 200 });
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
            return new Response("ok", { status: 200 });
          }

          // Idempotência: se já estava paid, não dispara de novo
          if (pedido.status === "paid") {
            return new Response("ok", { status: 200 });
          }

          const { error: updErr } = await supabaseAdmin
            .from("pedidos")
            .update({ status: "paid", error_detail: null })
            .eq("id", pedido.id);
          if (updErr) {
            console.error("[mp-webhook] update falhou", updErr);
            return new Response("ok", { status: 200 });
          }

          // 3) Smart Cost Routing v58-B: ranqueia por menor custo BRL real, com sentinela de saúde.
          const { rankProvidersByCost, markProviderUnstable, clearProviderUnstable } = await import("@/lib/smart-routing.server");
          const cadeia = await rankProvidersByCost({ pacote: pedido.pacote, quantidade: pedido.quantidade });

          if (!cadeia.length) {
            await supabaseAdmin
              .from("pedidos")
              .update({ status: "SMM_FAILED", error_detail: "Nenhum fornecedor ATIVO com saldo > 0 (smart routing vazio)" })
              .eq("id", pedido.id);
            return new Response("ok", { status: 200 });
          }

          console.log("[mp-webhook] smart-routing rank", {
            pedidoId: pedido.id,
            ordem: cadeia.map((p) => ({ slug: p.slug, cost: p.cost_brl, unstable: p.unstable })),
          });

          const { dispatchByFornecedor, refundMercadoPago } = await import("@/lib/dispatcher-fallback.server");
          const { respectsMinMargin } = await import("@/lib/margin-guardian");
          const tentativas: string[] = [];
          let sucesso = false;
          let margemBloqueada = 0;

          for (const f of cadeia) {
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
            const r = await dispatchByFornecedor(f.slug, {
              pacote: pedido.pacote,
              quantidade: pedido.quantidade,
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
                  error_detail: `Enviado via ${f.nome} (order ${r.orderId ?? "?"})`,
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
            console.error("[mp-webhook] todos fornecedores falharam → estorno", { pedidoId: pedido.id, tentativas });
            const refund = await refundMercadoPago(String(paymentId));
            const novoStatus = refund.ok ? "mp_refunded" : "SMM_FAILED";
            const logDetail = refund.ok
              ? `Estorno automático executado via Pix devido a falha geral de entrega. Tentativas: ${falhaResumo}`
              : `Falha geral + estorno falhou (${refund.detail}). Tentativas: ${falhaResumo}`;
            await supabaseAdmin
              .from("pedidos")
              .update({ status: novoStatus, error_detail: logDetail.slice(0, 500) })
              .eq("id", pedido.id);

            const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
            const alertMsg = refund.ok
              ? `🚨 Pedido ${pedido.id} falhou em todos os fornecedores. Pix estornado automaticamente para o cliente.`
              : `🚨 Pedido ${pedido.id} falhou em todos os fornecedores E o estorno automático falhou (${refund.detail}). Ação manual necessária.`;
            await dispatchWhatsappAlert(alertMsg).catch((e) => console.error("[mp-webhook] alerta tg", e));
          }

          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[mp-webhook] erro inesperado", err);
          return new Response("ok", { status: 200 });
        }
      },
    },
  },
});
