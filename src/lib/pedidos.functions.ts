import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pedidoSchema = z.object({
  instagram_user: z.string().min(1).max(200),
  pacote: z.string().min(1).max(20),
  quantidade: z.number().int().positive(),
  valor: z.number().positive(),
  email: z.string().email().max(200),
  whatsapp_contato: z.string().min(5).max(50).optional(),
  rede_social: z.enum(["instagram", "tiktok"]).optional(),
});

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);

// Tabela oficial (fonte de verdade no servidor) — keyed por pacote id.
// Evita preço adulterado pelo cliente e diferencia seguidores vs curtidas.
const PRICE_TABLE: Record<string, { quantidade: number; valor: number }> = {
  // Instagram — Seguidores
  p100:   { quantidade: 100,    valor: 5.0 },
  p500:   { quantidade: 500,    valor: 12.0 },
  p1k:    { quantidade: 1000,   valor: 18.0 },
  p2k:    { quantidade: 2000,   valor: 30.0 },
  p5k:    { quantidade: 5000,   valor: 65.0 },
  p10k:   { quantidade: 10000,  valor: 120.0 },
  p20k:   { quantidade: 20000,  valor: 220.0 },
  p50k:   { quantidade: 50000,  valor: 490.0 },
  p100k:  { quantidade: 100000, valor: 890.0 },
  // Instagram — Curtidas (service 18860)
  l100:   { quantidade: 100,  valor: 3.0 },
  l500:   { quantidade: 500,  valor: 7.0 },
  l1k:    { quantidade: 1000, valor: 12.0 },
  l2k:    { quantidade: 2000, valor: 19.0 },
  l5k:    { quantidade: 5000, valor: 39.0 },
  // Instagram — Visualizações
  v1k:    { quantidade: 1000,  valor: 5.0 },
  v5k:    { quantidade: 5000,  valor: 12.0 },
  v10k:   { quantidade: 10000, valor: 19.0 },
  v25k:   { quantidade: 25000, valor: 39.0 },
  v50k:   { quantidade: 50000, valor: 69.0 },
  // TikTok — Seguidores (service 14330)
  tf100:  { quantidade: 100,  valor: 9.0 },
  tf500:  { quantidade: 500,  valor: 29.0 },
  tf1k:   { quantidade: 1000, valor: 49.0 },
  // TikTok — Curtidas (service 19191)
  tl500:  { quantidade: 500,  valor: 9.0 },
  tl1k:   { quantidade: 1000, valor: 15.0 },
  tl2k:   { quantidade: 2000, valor: 27.0 },
  // TikTok — Visualizações (service 14907)
  tv5k:   { quantidade: 5000,  valor: 7.0 },
  tv10k:  { quantidade: 10000, valor: 12.0 },
  tv50k:  { quantidade: 50000, valor: 39.0 },
};

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) => pedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const oficial = PRICE_TABLE[data.pacote];
    if (!oficial || oficial.quantidade !== data.quantidade) {
      console.error("[criarPedido] pacote/quantidade inválidos:", data.pacote, data.quantidade);
      return { ok: false as const, error: "INVALID_PACKAGE" as const };
    }
    const valorCobrar = oficial.valor;
    const pkg = data.pacote.toLowerCase();
    const isTiktok = pkg.startsWith("t");
    const rede = data.rede_social ?? (isTiktok ? "tiktok" : "instagram");
    const categoria =
      isTiktok
        ? (pkg.startsWith("tl") ? "curtidas" : pkg.startsWith("tv") ? "visualizacoes" : "seguidores")
        : (pkg.startsWith("l") ? "curtidas" : pkg.startsWith("v") ? "visualizacoes" : "seguidores");


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
          transaction_amount: Number(valorCobrar.toFixed(2)),
          description: `BoostGram - ${rede.toUpperCase()} pacote ${clean(data.pacote)} (${data.quantidade} ${categoria}) para ${clean(data.instagram_user)}`,
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
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const supabase = supabaseAdmin;
      const { data: inserted, error } = await supabase
        .from("pedidos")
        .insert({
          instagram_user: clean(data.instagram_user),
          pacote: clean(data.pacote),
          quantidade: data.quantidade,
          valor: valorCobrar,
          status: "pending",
          mercado_pago_id: mpId,
          rede_social: rede,
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
