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

          // 3) Dispara pedido no fornecedor ATIVO (flag ativo:true, menor prioridade)
          const { data: fornecedorAtivo } = await supabaseAdmin
            .from("fornecedores")
            .select("slug, nome")
            .eq("ativo", true)
            .order("prioridade", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!fornecedorAtivo) {
            console.error("[mp-webhook] nenhum fornecedor ativo", { pedidoId: pedido.id });
            await supabaseAdmin
              .from("pedidos")
              .update({ status: "SMM_FAILED", error_detail: "Nenhum fornecedor ativo no painel" })
              .eq("id", pedido.id);
            return new Response("ok", { status: 200 });
          }

          if (fornecedorAtivo.slug === "smmhype") {
            const { dispatchSmmhype } = await import("@/lib/smmhype.server");
            const smm = await dispatchSmmhype({
              pacote: pedido.pacote,
              quantidade: pedido.quantidade,
              instagram_user: pedido.instagram_user,
            });
            if (!smm.ok) {
              console.error("[mp-webhook] SMMhype falhou", { pedidoId: pedido.id, ...smm });
              const detail = `${smm.error}${smm.status ? ` (HTTP ${smm.status})` : ""}${
                smm.body ? ` · ${typeof smm.body === "string" ? smm.body : JSON.stringify(smm.body)}` : ""
              }`.slice(0, 500);
              await supabaseAdmin
                .from("pedidos")
                .update({ status: "SMM_FAILED", error_detail: detail })
                .eq("id", pedido.id);
            } else {
              console.log("[mp-webhook] SMMhype ok", { pedidoId: pedido.id, orderId: smm.orderId });
            }
          } else {
            const msg = `Fornecedor ativo '${fornecedorAtivo.nome}' ainda não tem dispatcher implementado. Reative o SMMhype.`;
            console.error("[mp-webhook]", msg, { pedidoId: pedido.id });
            await supabaseAdmin
              .from("pedidos")
              .update({ status: "SMM_FAILED", error_detail: msg })
              .eq("id", pedido.id);
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
