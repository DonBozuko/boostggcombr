import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// v244: sanitizado (finding mcp_consultar_pedido_pii_leak).
// Não retorna mais instagram_user, valor_brl, quantidade nem network — só status
// genérico. Order IDs são adivinháveis por terceiros (ficam em URLs/e-mails),
// então PII do comprador não pode sair por essa porta pública.
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
  description:
    "Consulta o status genérico de um pedido do BoostGG pelo ID (retorna apenas: aguardando_pagamento, pago, em_processamento, entregue, cancelado, reembolsado ou recusado). Não expõe dados do comprador.",
  inputSchema: {
    pedido_id: z.string().min(4).describe("ID público do pedido"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ pedido_id }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Backend indisponível." }], isError: true };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb
      .from("pedidos")
      .select("id, status")
      .eq("id", pedido_id)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Pedido não encontrado." }], isError: true };
    }
    const statusPublico = STATUS_PUBLICO[String((data as { status: string }).status)] ?? "desconhecido";
    const payload = { id: (data as { id: string }).id, status: statusPublico };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
