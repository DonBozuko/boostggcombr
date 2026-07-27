// LGPD — Auto-exclusão pelo cliente via ID do pagamento Mercado Pago.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/lgpd-delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            mercado_pago_id?: unknown;
            confirmacao?: unknown;
          };
          const mpId = typeof body.mercado_pago_id === "string" ? body.mercado_pago_id.trim() : "";
          // v295 — dupla confirmação: só o ID do pagamento não prova ser o dono do pedido.
          const confirm = typeof body.confirmacao === "string" ? body.confirmacao.trim().slice(0, 160) : "";
          if (!mpId || mpId.length < 4 || mpId.length > 60) {
            return Response.json({ ok: false, message: "Informe o ID do pagamento (mínimo 4 caracteres)." }, { status: 400 });
          }
          if (confirm.length < 3) {
            return Response.json(
              { ok: false, message: "Informe também o @ do perfil, e-mail ou WhatsApp usado no pedido." },
              { status: 400 },
            );
          }
          const ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            null;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("solicitar_exclusao_pedido" as any, {
            _mp_id: mpId,
            _client_ip: ip,
            _confirm: confirm,
          });

          if (error) {
            console.error("[lgpd-delete] rpc erro:", error);
            return Response.json({ ok: false, message: "Falha temporária, tente novamente." }, { status: 500 });
          }
          const row = Array.isArray(data) ? data[0] : data;
          return Response.json({ ok: !!row?.ok, message: row?.message ?? "Solicitação registrada." });
        } catch (err) {
          console.error("[lgpd-delete] falha:", err);
          return Response.json({ ok: false, message: "Erro inesperado." }, { status: 500 });
        }
      },
    },
  },
});
