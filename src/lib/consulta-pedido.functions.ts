import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ pedidoId: z.string().min(4).max(60) });

const STATUS_MSG: Record<string, string> = {
  pending: "Seu pedido está aguardando confirmação do pagamento Pix, senhor.",
  paid: "Pagamento confirmado. Disparei o pedido para o fornecedor, senhor.",
  processing: "Seu pedido está em processamento na rede ativa, senhor.",
  completed: "Pedido entregue com sucesso! Operação concluída.",
  failed: "Detectei uma falha no pedido. Acione o suporte para reprocessar, senhor.",
  refunded: "Pedido reembolsado. Saldo devolvido pelo Mercado Pago.",
};

export const consultarPedidoPublico = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.pedidoId.trim();
    // Aceita UUID parcial (primeiros 8) ou mercado_pago_id
    let q = supabaseAdmin
      .from("pedidos")
      .select("id, status, rede_social, pacote, quantidade, created_at")
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
    const base = STATUS_MSG[r.status] ?? `Status atual: ${r.status}.`;
    return {
      ok: true as const,
      message: `${base} (${r.rede_social ?? "rede"} · ${r.pacote} · ${r.quantidade}).`,
      status: r.status,
    };
  });
