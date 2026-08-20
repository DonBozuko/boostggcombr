import { z } from "zod";
import { getMpAccessToken } from "./mp-token.server";

/**
 * v643 — Gateway de pagamento real.
 *
 * Causa raiz corrigida aqui: até a v642 TODO checkout criava apenas uma
 * "preference" do Checkout Pro e devolvia `init_point` fingindo ser Pix.
 * Resultado prático: QR sempre vazio e "copia e cola" contendo uma URL —
 * nenhum aplicativo de banco aceita isso. O cliente abria o modal e saía.
 *
 * Agora existem dois caminhos explícitos e honestos:
 *   • Pix    → POST /v1/payments (payment_method_id: "pix") → QR e copia-e-cola reais.
 *   • Cartão → POST /checkout/preferences (Checkout Pro) → URL de checkout real.
 *
 * `external_reference` usa o prefixo "pedido:" porque o webhook já sabe ler
 * esse formato para carimbar o payment id no pedido. Não mexemos em webhook,
 * contingência, reconciliador, SLA, roteamento, claim/commit nem ledger.
 */

const MP_API = "https://api.mercadopago.com";
const NOTIFICATION_URL = "https://www.boostgg.com.br/api/public/mp-webhook";

export const PreferenceInputSchema = z.object({
  id: z.string(),
  pacote: z.string(),
  quantidade: z.number(),
  valor: z.number(),
  alvo: z.string(),
  email: z.string().optional(),
});

export type PreferenceInput = z.infer<typeof PreferenceInputSchema>;

export type PixPayment = {
  paymentId: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string | null;
  expiresAt: string | null;
};

export type CardCheckout = {
  id: string;
  checkoutUrl: string;
  sandboxCheckoutUrl: string | null;
};

/** E-mail é obrigatório para o pagador no Mercado Pago; sem um válido o Pix nem nasce. */
function payerEmail(email?: string): string {
  const e = (email ?? "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : "cliente@boostgg.com.br";
}

function descricao(data: PreferenceInput): string {
  return `${data.quantidade} ${data.pacote} para ${data.alvo}`;
}

async function mpFetch(path: string, body: unknown, idempotencyKey: string) {
  const token = await getMpAccessToken();
  return fetch(`${MP_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Duplo clique / retry do cliente não pode virar duas cobranças.
      // Idempotency key baseada no ID do pedido (ex: pix:UUID ou card:UUID)
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
}

/**
 * v649/v650 — FASE 2: Pix Real e Contrato de Retorno.
 *
 * Cria um pagamento Pix de verdade e devolve o BR Code (copia e cola) e o QR
 * em base64. Valida rigorosamente a presença dos dados oficiais do gateway.
 */
export async function createMercadoPagoPixPayment(data: PreferenceInput): Promise<PixPayment> {
  const body = {
    transaction_amount: Number(data.valor.toFixed(2)),
    payment_method_id: "pix",
    description: descricao(data),
    external_reference: `pedido:${data.id}`,
    notification_url: NOTIFICATION_URL,
    payer: { email: payerEmail(data.email) },
  };

  const response = await mpFetch("/v1/payments", body, `pix:${data.id}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mercado Pago Pix error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as {
    id?: string | number;
    status?: string;
    date_of_expiration?: string | null;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string | null;
        qr_code_base64?: string | null;
        ticket_url?: string | null;
      } | null;
    } | null;
    init_point?: string; // Verificação anti-regressão
  };

  const paymentId = String(result.id ?? "").trim();
  const status = result.status ?? "pending";
  const td = result.point_of_interaction?.transaction_data ?? {};
  const qrCode = String(td.qr_code ?? "").trim();
  const qrCodeBase64 = String(td.qr_code_base64 ?? "").trim();

  // FASE 2 — VALIDAÇÃO CRÍTICA
  if (!paymentId) {
    throw new Error("Mercado Pago respondeu sem ID de pagamento");
  }
  if (!qrCode) {
    throw new Error("Mercado Pago respondeu sem código Pix (qr_code)");
  }
  if (!qrCodeBase64) {
    throw new Error("Mercado Pago respondeu sem QR Code Base64");
  }
  
  // Garantia anti-regressão: nunca usar init_point como dados PIX
  if (result.init_point && (qrCode === result.init_point || qrCodeBase64 === result.init_point)) {
    throw new Error("Falha Crítica: Gateway retornou init_point no lugar do Pix real");
  }

  return {
    paymentId,
    status,
    qrCode,
    qrCodeBase64,
    ticketUrl: td.ticket_url ?? null,
    expiresAt: result.date_of_expiration ?? null,
  };
}

/**
 * Cria a preferência de Checkout Pro para cartão e devolve a URL real de
 * checkout. Pix fica excluído aqui de propósito: quem escolheu cartão já
 * pagou o acréscimo da operadora no valor enviado.
 */
export async function createMercadoPagoCardCheckout(data: PreferenceInput): Promise<CardCheckout> {
  const body = {
    items: [
      {
        id: data.pacote,
        title: descricao(data),
        quantity: 1,
        unit_price: Number(data.valor.toFixed(2)),
        currency_id: "BRL",
      },
    ],
    payer: { email: payerEmail(data.email) },
    external_reference: `pedido:${data.id}`,
    notification_url: NOTIFICATION_URL,
    back_urls: {
      success: `https://www.boostgg.com.br/obrigado?order=${data.id}`,
      pending: `https://www.boostgg.com.br/obrigado?order=${data.id}`,
      failure: `https://www.boostgg.com.br/?pagamento=falhou`,
    },
    auto_return: "approved",
    payment_methods: {
      excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
      installments: 1,
    },
  };

  const response = await mpFetch("/checkout/preferences", body, `card:${data.id}`);
  if (!response.ok) {
    throw new Error(`Mercado Pago card error (${response.status}): ${await response.text()}`);
  }

  const result = (await response.json()) as {
    id?: string | number;
    init_point?: string | null;
    sandbox_init_point?: string | null;
  };

  const checkoutUrl = String(result.init_point ?? "").trim();
  if (!checkoutUrl) {
    throw new Error("Mercado Pago não devolveu a URL de checkout do cartão");
  }

  return {
    id: String(result.id ?? ""),
    checkoutUrl,
    sandboxCheckoutUrl: result.sandbox_init_point ?? null,
  };
}
