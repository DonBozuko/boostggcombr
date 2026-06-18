import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const pedidoSchema = z.object({
  pacote_selecionado: z.string().min(1).max(50),
  link_instagram: z.string().min(2).max(200),
  whatsapp_contato: z.string().min(5).max(50),
  status_pagamento: z.literal("pendente"),
});

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) => pedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const payload = {
      pacote_selecionado: clean(data.pacote_selecionado),
      link_instagram: clean(data.link_instagram),
      whatsapp_contato: clean(data.whatsapp_contato),
      status_pagamento: data.status_pagamento,
    };

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
      );
      const { error: dbError } = await supabase.from("pedidos").insert(payload);
      if (dbError) {
        console.error("Erro ao inserir pedido:", dbError);
        return { ok: false, error: "DB_FAILED" as const };
      }
    } catch (err) {
      console.error("Erro inesperado no Supabase:", err);
      return { ok: false, error: "DB_FAILED" as const };
    }

    return { ok: true as const };
  });
