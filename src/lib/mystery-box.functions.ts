// v115 — Mystery Box Redemption (One-Time Reward Validator)
// Servidor: valida elegibilidade, evita duplo-resgate por payment_id/pedido_id,
// sorteia 10..50 e despacha ordem extra para o fornecedor mestre (via smart-routing).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MIN_QTY = 200; // v190 — alinhado à UI (Bônus Especial promete "acima de 200 unidades")
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
      .select("id, status, pacote, quantidade, instagram_user, mercado_pago_id, error_detail, rede_social")
      .eq("id", data.pedidoId)
      .maybeSingle();

    if (error || !pedido) return { ok: false as const, error: "PEDIDO_NAO_ENCONTRADO" };
    if (pedido.status !== "paid") return { ok: false as const, error: "PEDIDO_NAO_PAGO" };
    if (Number(pedido.quantidade) < MIN_QTY) return { ok: false as const, error: "QTD_INSUFICIENTE" };

    const detail = String(pedido.error_detail ?? "");
    const already = detail.match(MB_MARKER);
    if (already) {
      return { ok: false as const, error: "JA_RESGATADO", bonus: Number(already[1]) };
    }

    // v182 — Bônus inteligente: faixa oficial 10..50, /trafego bloqueado.
    // Distribuição pseudo-aleatória com viés anti-repetição por pedido (hash do id
    // desloca a base para evitar padrões previsíveis entre resgates consecutivos).
    const rede = String((pedido as any).rede_social ?? "instagram").toLowerCase();
    if (rede === "trafego") {
      return { ok: false as const, error: "BONUS_INDISPONIVEL_TRAFEGO" };
    }
    const seed = Array.from(pedido.id).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const jitter = (seed % 41); // 0..40
    const roll = Math.floor(Math.random() * 41); // 0..40
    const bonus = 10 + ((jitter + roll) % 41); // 10..50 uniforme com deslocamento


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
