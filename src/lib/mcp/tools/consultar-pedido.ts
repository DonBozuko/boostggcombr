import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "consultar_pedido",
  title: "Consultar status de pedido",
  description:
    "Consulta o status de um pedido do BoostGG pelo ID público (retorna status, rede, quantidade e valor).",
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
      .select("id, network, quantidade, valor_brl, status, created_at")
      .eq("id", pedido_id)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Pedido não encontrado." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: data,
    };
  },
});
