import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pedidoSchema = z.object({
  instagram_user: z.string().min(1).max(200),
  pacote: z.enum(["start", "growth", "vip"]),
  quantidade: z.number().int().positive(),
  valor: z.number().positive(),
  email: z.string().email().max(200),
  whatsapp_contato: z.string().min(5).max(50).optional(),
});

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) => pedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpToken) {
      console.error("MERCADO_PAGO_ACCESS_TOKEN ausente");
      return { ok: false as const, error: "MP_TOKEN_MISSING" as const };
    }

    // 1) Cria o pagamento Pix no Mercado Pago
    let mpId: string | null = null;
    let qrCode = "";
    let qrCodeBase64 = "";
    try {
      const idempotencyKey =
        (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpToken}`,
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          transaction_amount: Number(data.valor.toFixed(2)),
          description: `BoostGram - Pacote ${clean(data.pacote)} (${data.quantidade} seguidores) para ${clean(data.instagram_user)}`,
          payment_method_id: "pix",
          payer: { email: data.email.trim().toLowerCase() },
        }),
      });
      const mpJson: unknown = await mpRes.json().catch(() => ({}));
      if (!mpRes.ok) {
        console.error("Mercado Pago erro:", mpRes.status, mpJson);
        return { ok: false as const, error: "MP_FAILED" as const };
      }
      const mp = mpJson as {
        id?: number | string;
        point_of_interaction?: {
          transaction_data?: { qr_code?: string; qr_code_base64?: string };
        };
      };
      mpId = mp.id != null ? String(mp.id) : null;
      qrCode = mp.point_of_interaction?.transaction_data?.qr_code ?? "";
      qrCodeBase64 =
        mp.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";
      if (!qrCode || !qrCodeBase64) {
        console.error("MP sem QR Code no retorno:", mpJson);
        return { ok: false as const, error: "MP_NO_QR" as const };
      }
    } catch (err) {
      console.error("Falha de rede ao chamar Mercado Pago:", err);
      return { ok: false as const, error: "MP_FAILED" as const };
    }

    // 2) Persiste o pedido com status 'pending' e o mercado_pago_id
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
      );
      const { data: inserted, error } = await supabase
        .from("pedidos")
        .insert({
          instagram_user: clean(data.instagram_user),
          pacote: clean(data.pacote),
          quantidade: data.quantidade,
          valor: data.valor,
          status: "pending",
          mercado_pago_id: mpId,
        })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("Erro ao inserir pedido:", error);
        return { ok: false as const, error: "DB_FAILED" as const };
      }
      return {
        ok: true as const,
        pedidoId: inserted.id,
        mercadoPagoId: mpId,
        qrCode,
        qrCodeBase64,
      };
    } catch (err) {
      console.error("Erro inesperado no Supabase:", err);
      return { ok: false as const, error: "DB_FAILED" as const };
    }
  });
