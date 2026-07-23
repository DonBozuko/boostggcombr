// v220 — Aprovação manual de refund para pedidos AWAITING_REFUND_APPROVAL (>R$50).
// Auth: header `x-admin-token: <ADMIN_TOKEN>`.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({ pedido_id: z.string().min(1) });

export const Route = createFileRoute("/api/public/queue/approve-refund")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-admin-token") ?? "";
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }
        let body: unknown;
        try { body = await request.json(); } catch { body = null; }
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_INPUT" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { refundMercadoPago } = await import("@/lib/dispatcher-fallback.server");

        const { data: p, error: loadErr } = await supabaseAdmin
          .from("pedidos")
          .select("id, status, mercado_pago_id, valor, pacote, email_contato")
          .eq("id", parsed.data.pedido_id)
          .maybeSingle();
        if (loadErr || !p) {
          return new Response(JSON.stringify({ ok: false, error: "NOT_FOUND" }), {
            status: 404, headers: { "Content-Type": "application/json" },
          });
        }
        if ((p as any).status !== "AWAITING_REFUND_APPROVAL") {
          return new Response(JSON.stringify({ ok: false, error: `status inválido: ${(p as any).status}` }), {
            status: 409, headers: { "Content-Type": "application/json" },
          });
        }
        if (!(p as any).mercado_pago_id) {
          return new Response(JSON.stringify({ ok: false, error: "SEM_MERCADO_PAGO_ID" }), {
            status: 422, headers: { "Content-Type": "application/json" },
          });
        }

        let refund = await refundMercadoPago(String((p as any).mercado_pago_id));
        const attempts: string[] = [`t1: ${refund.ok ? "OK" : refund.detail}`];
        for (let i = 2; i <= 3 && !refund.ok; i++) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(3, i - 2)));
          refund = await refundMercadoPago(String((p as any).mercado_pago_id));
          attempts.push(`t${i}: ${refund.ok ? "OK" : refund.detail}`);
        }

        await supabaseAdmin
          .from("pedidos")
          .update({
            status: refund.ok ? "mp_refunded" : "SMM_FAILED",
            error_detail: `Refund manual aprovado. ${refund.ok ? "OK" : "FALHOU"} (${attempts.join(" | ")})`.slice(0, 500),
          } as any)
          .eq("id", (p as any).id);

        if (refund.ok) {
          const email = String((p as any).email_contato ?? "").toLowerCase().trim();
          if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes("anonimizado")) {
            try {
              await supabaseAdmin.rpc("enqueue_email" as any, {
                queue_name: "transactional_emails",
                payload: {
                  template_name: "refund-notice",
                  recipient_email: email,
                  idempotency_key: `refund-notice-${(p as any).id}`,
                  template_data: {
                    pacote: (p as any).pacote ?? null,
                    valor: Number((p as any).valor ?? 0).toFixed(2).replace(".", ","),
                    pedidoId: String((p as any).id).slice(0, 8),
                  },
                },
              } as any);
            } catch { /* */ }
          }
        }

        try {
          await supabaseAdmin.from("admin_audit_logs" as any).insert({
            admin_email: "admin@manual-refund-approval",
            action: "REFUND_APPROVED_v220",
            detail: { pedido_id: (p as any).id, valor: (p as any).valor, refund_ok: refund.ok, attempts } as any,
            created_at: new Date().toISOString(),
          } as any);
        } catch { /* */ }

        return new Response(JSON.stringify({ ok: refund.ok, detail: refund.detail, attempts }), {
          status: refund.ok ? 200 : 502, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
