import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const STATUS_PUBLICO: Record<string, string> = {
  pending: "aguardando_pagamento",
  mp_pending: "aguardando_pagamento",
  mp_in_process: "aguardando_pagamento",
  paid: "pago",
  waiting_provision: "em_processamento",
  processing: "em_processamento",
  MARGIN_HOLD: "em_processamento",
  SMM_FAILED: "em_processamento",
  completed: "entregue",
  Enviado: "entregue",
  cancelled: "cancelado",
  mp_refunded: "reembolsado",
  mp_rejected: "recusado",
};

export default defineTool({
  name: "consultar_pedido",
  title: "Consultar status de pedido",
  description: "Consulta o status de um pedido. Requer que o usuário esteja logado.",
  inputSchema: {
    pedido_id: z.string().min(4).describe("ID do pedido"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ pedido_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Autenticação necessária para consultar pedidos." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("pedidos")
      .select("id, status")
      .eq("id", pedido_id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: `Erro no banco: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Pedido não encontrado ou acesso negado." }], isError: true };

    const statusPublico = STATUS_PUBLICO[String(data.status)] ?? "desconhecido";
    return {
      content: [{ type: "text", text: `Pedido ${data.id}: ${statusPublico}` }],
      structuredContent: { id: data.id, status: statusPublico },
    };
  },
});
