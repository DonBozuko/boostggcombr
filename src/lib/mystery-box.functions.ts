// v115 — Mystery Box Redemption (One-Time Reward Validator)
// Servidor: valida elegibilidade, evita duplo-resgate por payment_id/pedido_id,
// sorteia 10..50 e despacha ordem extra para o fornecedor mestre (via smart-routing).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MIN_QTY = 201; // estritamente ACIMA de 200
const MB_MARKER = /MB_REDEEMED:(\d+)/i;

const input = z.object({
  pedidoId: z.string().uuid(),
  handle: z.string().trim().min(2).max(200),
});

export const redeemMysteryBox = createServerFn({ method: "POST" })
  .inputValidator((v) => input.parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pedido, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, pacote, quantidade, instagram_user, mercado_pago_id, error_detail")
      .eq("id", data.pedidoId)
      .maybeSingle();

    if (error || !pedido) return { ok: false as const, error: "PEDIDO_NAO_ENCONTRADO" };
    if (pedido.status !== "paid") return { ok: false as const, error: "PEDIDO_NAO_PAGO" };
    if (Number(pedido.quantidade) <= 200) return { ok: false as const, error: "QTD_INSUFICIENTE" };

    const detail = String(pedido.error_detail ?? "");
    const already = detail.match(MB_MARKER);
    if (already) {
      return { ok: false as const, error: "JA_RESGATADO", bonus: Number(already[1]) };
    }

    // Sorteio 10..50
    const bonus = 10 + Math.floor(Math.random() * 41);

    // Trava atômica: só grava marcador se ainda não existir
    const novoDetail = detail
      ? `${detail} · MB_REDEEMED:${bonus} @${data.handle}`
      : `MB_REDEEMED:${bonus} @${data.handle}`;
    const { error: updErr, data: updated } = await supabaseAdmin
      .from("pedidos")
      .update({ error_detail: novoDetail.slice(0, 500) })
      .eq("id", pedido.id)
      .not("error_detail", "ilike", "%MB_REDEEMED:%")
      .select("id")
      .maybeSingle();
    if (updErr || !updated) {
      return { ok: false as const, error: "JA_RESGATADO" };
    }

    // Dispatch bônus via smart-routing (mesmo pacote, quantidade = bonus)
    try {
      const { rankProvidersByCost } = await import("./smart-routing.server");
      const { dispatchByFornecedor } = await import("./dispatcher-fallback.server");
      const cadeia = await rankProvidersByCost({ pacote: pedido.pacote, quantidade: bonus });
      let orderId: string | number | undefined;
      for (const f of cadeia) {
        const r = await dispatchByFornecedor(f.slug, {
          pacote: pedido.pacote,
          quantidade: bonus,
          instagram_user: data.handle,
          serviceIdOverride: f.provider_service_id ?? null,
        });
        if (r.ok) { orderId = r.orderId; break; }
      }
      return { ok: true as const, bonus, orderId: orderId ?? null };
    } catch (e) {
      console.error("[mystery-box] dispatch falhou", e);
      // Bônus fica marcado como resgatado; equipe pode reprocessar manualmente.
      return { ok: true as const, bonus, orderId: null };
    }
  });
