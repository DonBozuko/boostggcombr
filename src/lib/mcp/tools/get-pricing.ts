import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_pricing",
  title: "Consultar preços de pacotes",
  description:
    "Lista os pacotes disponíveis (rede social, quantidade, preço em BRL) da vitrine pública do BoostGG.",
  inputSchema: {
    network: z
      .enum(["tiktok", "instagram", "youtube", "facebook", "telegram", "trafego"])
      .optional()
      .describe("Filtrar por rede social. Omita para retornar todas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ network }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Backend indisponível." }], isError: true };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    let q = sb
      .from("pricing_items")
      .select("network, quantidade, price_brl")
      .order("network", { ascending: true })
      .order("quantidade", { ascending: true });
    if (network) q = q.eq("network", network);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
