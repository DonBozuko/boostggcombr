import { createFileRoute } from "@tanstack/react-router";

// ============================================================
// Mapeamento pacote -> service ID do SMMhype.
// TROQUE pelos IDs reais do painel do SMMhype quando tiver.
// ============================================================
const SMMHYPE_SERVICE_IDS: Record<string, number> = {
  Start: 0, // R$ 39,90 — 1.000 seguidores
  Growth: 0, // R$ 89,90 — 3.000 seguidores
  VIP: 0, // R$ 139,90 — 5.000 seguidores
};

const SMMHYPE_ENDPOINT = "https://smmhype.com/api/v2";
const MP_PAYMENTS_ENDPOINT = "https://api.mercadopago.com/v1/payments";

function normalizeInstagramUser(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@+/, "").replace(/^instagram\.com\//i, "");
  return `https://instagram.com/${handle}`;
}

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
          const payment = (await mpRes.json()) as { status?: string; id?: string | number };
          if (payment.status !== "approved") {
            console.log("[mp-webhook] status != approved", payment.status, paymentId);
            return new Response("ok", { status: 200 });
          }

          // 2) Atualiza pedido para 'paid' (admin client p/ contornar RLS)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: pedido, error: selErr } = await supabaseAdmin
            .from("pedidos")
            .select("id, status, pacote, quantidade, instagram_user")
            .eq("mercado_pago_id", String(paymentId))
            .maybeSingle();

          if (selErr || !pedido) {
            console.error("[mp-webhook] pedido não encontrado", paymentId, selErr);
            return new Response("ok", { status: 200 });
          }

          // Idempotência: se já estava paid, não dispara de novo
          if (pedido.status === "paid") {
            return new Response("ok", { status: 200 });
          }

          const { error: updErr } = await supabaseAdmin
            .from("pedidos")
            .update({ status: "paid" })
            .eq("id", pedido.id);
          if (updErr) {
            console.error("[mp-webhook] update falhou", updErr);
            return new Response("ok", { status: 200 });
          }

          // 3) Dispara pedido no SMMhype
          const smmKey = process.env.SMMHYPE_API_KEY;
          if (!smmKey) {
            console.error("[mp-webhook] SMMHYPE_API_KEY ausente — pedido marcado paid sem disparo");
            return new Response("ok", { status: 200 });
          }
          const serviceId = SMMHYPE_SERVICE_IDS[pedido.pacote];
          if (!serviceId) {
            console.error("[mp-webhook] service id ausente p/ pacote", pedido.pacote);
            return new Response("ok", { status: 200 });
          }

          const smmBody = new URLSearchParams({
            key: smmKey,
            action: "add",
            service: String(serviceId),
            link: normalizeInstagramUser(pedido.instagram_user),
            quantity: String(pedido.quantidade),
          });

          const smmRes = await fetch(SMMHYPE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: smmBody.toString(),
          });
          const smmJson = await smmRes.json().catch(() => ({}));
          if (!smmRes.ok || (smmJson as { error?: string }).error) {
            console.error("[mp-webhook] SMMhype falhou", smmRes.status, smmJson);
          } else {
            console.log("[mp-webhook] SMMhype ok", smmJson);
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
