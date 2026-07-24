// v227 — Aprovação manual de refund para AWAITING_REFUND_APPROVAL (>R$50).
// Auth: Supabase JWT com role 'admin' em user_roles (preferido) OU x-admin-token (fallback).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({ pedido_id: z.string().min(1), dry_run: z.boolean().optional(), force_refund: z.boolean().optional() });

async function authorize(request: Request): Promise<{ ok: boolean; who: string }> {
  const authz = request.headers.get("authorization") ?? "";
  const bearer = authz.toLowerCase().startsWith("bearer ") ? authz.slice(7).trim() : "";
  if (bearer) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: u } = await sb.auth.getUser(bearer);
      if (u?.user?.id) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: role } = await supabaseAdmin
          .from("user_roles" as any).select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
        if (role) return { ok: true, who: u.user.email ?? u.user.id };
      }
    } catch { /* cai pro fallback */ }
  }
  const tok = request.headers.get("x-admin-token") ?? "";
  if (process.env.ADMIN_TOKEN && tok === process.env.ADMIN_TOKEN) return { ok: true, who: "admin@token" };
  return { ok: false, who: "" };
}

export const Route = createFileRoute("/api/public/queue/approve-refund")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorize(request);
        if (!auth.ok) {
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

        const { data: p, error: loadErr } = await supabaseAdmin
          .from("pedidos")
          .select("id, status, mercado_pago_id, valor, pacote, email_contato, provider_slug, provider_order_id")
          .eq("id", parsed.data.pedido_id)
          .maybeSingle();

        // v228 — dry_run: valida auth + retorna info do pedido, SEM chamar MP, SEM mutação.
        if (parsed.data.dry_run) {
          return new Response(JSON.stringify({
            ok: true,
            dry_run: true,
            auth_who: auth.who,
            pedido_found: !!p,
            pedido_status: (p as any)?.status ?? null,
            has_mp_id: !!(p as any)?.mercado_pago_id,
            provider_slug: (p as any)?.provider_slug ?? null,
            has_provider_order_id: !!(p as any)?.provider_order_id,
            valor: (p as any)?.valor ?? null,
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

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

        const { refundMercadoPago, cancelAtProvider } = await import("@/lib/dispatcher-fallback.server");

        // v230 — cancel-then-refund: recupera saldo no fornecedor ANTES de reembolsar cliente.
        // Se cancel falhar (em andamento/entregue) → bloqueia refund por padrão (prejuízo).
        // Admin pode forçar com force_refund: true (assumindo o prejuízo conscientemente).
        let cancelResult: { ok: boolean; detail: string; recoverable: boolean } = {
          ok: true, detail: "sem provider_slug (contingência sem dispatch)", recoverable: true,
        };
        const slug = String((p as any).provider_slug ?? "").toLowerCase().trim();
        const pOrderId = String((p as any).provider_order_id ?? "").trim();
        if (slug) {
          cancelResult = await cancelAtProvider(slug, pOrderId);
        }

        if (!cancelResult.ok && !parsed.data.force_refund) {
          return new Response(JSON.stringify({
            ok: false,
            error: "CANCEL_FALHOU_PREJUIZO_PROVAVEL",
            provider: slug,
            provider_order_id: pOrderId || null,
            cancel_detail: cancelResult.detail,
            hint: "Fornecedor não cancelou (pedido pode estar em andamento/entregue). Para reembolsar mesmo assim, reenvie com force_refund: true.",
          }), { status: 409, headers: { "Content-Type": "application/json" } });
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
            admin_email: auth.who || "admin@manual-refund-approval",
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
