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

          // 3) Smart Routing Matrix: cadeia de failover A→B→C.
          //    Inclui apenas fornecedores ATIVO=true e saldo_atual > 0 (ordenado por prioridade).
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
              .update({ status: "SMM_FAILED", error_detail: "Nenhum fornecedor ATIVO com saldo > 0 (failover esgotado)" })
              .eq("id", pedido.id);
            return new Response("ok", { status: 200 });
          }


          const { dispatchByFornecedor, refundMercadoPago } = await import("@/lib/dispatcher-fallback.server");
          const tentativas: string[] = [];
          let sucesso = false;

          for (const f of cadeia) {
            const r = await dispatchByFornecedor(f.slug, {
              pacote: pedido.pacote,
              quantidade: pedido.quantidade,
              instagram_user: pedido.instagram_user,
            });
            if (r.ok) {
              console.log("[mp-webhook] dispatch OK", { pedidoId: pedido.id, fornecedor: f.slug, orderId: r.orderId });

              // ===== Cálculo de custo real (atacado) =====
              // custo_brl = (quantidade / 1000) × rate(USD) × cotacao_brl
              let custoReal: number | null = null;
              try {
                const { resolveServiceIdAsync } = await import("@/lib/smmhype.server");
                const sid = await resolveServiceIdAsync(pedido.pacote, pedido.quantidade);
                if (sid != null) {
                  const [{ data: svc }, { data: forn }] = await Promise.all([
                    supabaseAdmin.from("services_cache").select("rate").eq("provider_service_id", sid).maybeSingle(),
                    supabaseAdmin.from("fornecedores").select("cotacao_brl").eq("slug", f.slug).maybeSingle(),
                  ]);
                  const rate = Number(svc?.rate);
                  const cot = Number((forn as any)?.cotacao_brl ?? 7.0) || 7.0;
                  if (Number.isFinite(rate) && rate > 0) {
                    custoReal = (Number(pedido.quantidade) / 1000) * rate * cot;
                  }
                }
              } catch (e) {
                console.warn("[mp-webhook] custo_real calc falhou", e);
              }

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
            console.warn("[mp-webhook] fallback", { pedidoId: pedido.id, fornecedor: f.slug, ...r });
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
