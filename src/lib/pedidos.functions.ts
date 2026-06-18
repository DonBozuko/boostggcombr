import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pedidoSchema = z.object({
  pacote_selecionado: z.string().min(1).max(50),
  link_instagram: z.string().min(2).max(200),
  whatsapp_contato: z.string().min(5).max(50),
  status_pagamento: z.literal("pendente"),
});

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) => pedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createSupabasePublicClient();

    // 1. Insere no banco
    const { error: dbError } = await supabase
      .from("pedidos")
      .insert({
        pacote_selecionado: data.pacote_selecionado,
        link_instagram: data.link_instagram,
        whatsapp_contato: data.whatsapp_contato,
        status_pagamento: data.status_pagamento,
      });

    if (dbError) {
      console.error("Erro ao inserir pedido:", dbError);
      throw new Error("Erro ao registrar pedido no banco de dados.");
    }

    // 2. Envia para o webhook da Make.com
    try {
      const webhookUrl = "https://hook.us2.make.com/mcpsxyj34lp1gcsrocek2sra0b3teoo5";
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacote_selecionado: data.pacote_selecionado,
          link_instagram: data.link_instagram,
          whatsapp_contato: data.whatsapp_contato,
          status_pagamento: data.status_pagamento,
          criado_em: new Date().toISOString(),
        }),
      });
    } catch (webhookErr) {
      // Não quebra o fluxo do usuário se o webhook falhar
      console.error("Erro ao chamar webhook:", webhookErr);
    }

    return { ok: true };
  });

function createSupabasePublicClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
  );
}
