import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
// v325 — ponto único de verdade da tradução de status para o cliente.
import { statusLabelPt, toCanonicalStatus } from "./order-status";

const input = z.object({ pedidoId: z.string().min(4).max(60) });


export const consultarPedidoPublico = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.pedidoId.trim();
    // Aceita UUID parcial (primeiros 8) ou mercado_pago_id
    // IMPORTANTE: nunca expor PII (instagram_user, mercado_pago_id, valor, whatsapp).
    // Retornar apenas campos mínimos para exibir status ao cliente.
    let q = supabaseAdmin
      .from("pedidos")
      .select("status, rede_social, pacote, quantidade")
      .limit(1);
    if (/^[0-9a-fA-F-]{8,}$/.test(raw)) {
      q = q.or(`id.eq.${raw},mercado_pago_id.eq.${raw}`);
    } else {
      q = q.eq("mercado_pago_id", raw);
    }
    const { data: rows, error } = await q;
    if (error || !rows || rows.length === 0) {
      return { ok: false as const, message: "Não localizei esse pedido, senhor. Confirme o ID." };
    }
    const r = rows[0]!;
    const base = statusLabelPt(r.status);
    return {
      ok: true as const,
      message: `${base} (${r.rede_social ?? "rede"} · ${r.pacote} · ${r.quantidade}).`,
      // v325 — o cliente vê o estado público; o interno fica só no admin.
      status: toCanonicalStatus(r.status),
    };


  });
