import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const pedidoSchema = z.object({
  instagram_user: z.string().min(1).max(200),
  pacote: z.string().min(1).max(50),
  quantidade: z.number().int().positive(),
  valor: z.number().nonnegative(),
  whatsapp_contato: z.string().min(5).max(50).optional(),
});

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) => pedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const payload = {
      instagram_user: clean(data.instagram_user),
      pacote: clean(data.pacote),
      quantidade: data.quantidade,
      valor: data.valor,
      status: "pending" as const,
      // mercado_pago_id: preenchido depois pela integração real com Mercado Pago
    };

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
      );
      const { data: inserted, error } = await supabase
        .from("pedidos")
        .insert(payload)
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("Erro ao inserir pedido:", error);
        return { ok: false as const, error: "DB_FAILED" as const };
      }
      return { ok: true as const, pedidoId: inserted.id };
    } catch (err) {
      console.error("Erro inesperado no Supabase:", err);
      return { ok: false as const, error: "DB_FAILED" as const };
    }
  });
